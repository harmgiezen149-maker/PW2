package io.github.minilauncher.usage

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import java.util.Calendar

/**
 * Computes per-app foreground time since local midnight from UsageStatsManager
 * events (RESUMED/PAUSED pairs — much more accurate than queryUsageStats
 * buckets). Results are cached for a minute because the accessibility service
 * consults this on every app switch.
 */
class UsageRepository(context: Context) {

    private val usm =
        context.applicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

    @Volatile
    private var cache: Map<String, Long> = emptyMap()

    @Volatile
    private var cacheTimestamp: Long = 0L

    fun todayUsageMillis(pkg: String): Long = todayUsageByPackage()[pkg] ?: 0L

    @Synchronized
    fun todayUsageByPackage(maxAgeMillis: Long = 60_000L): Map<String, Long> {
        val now = System.currentTimeMillis()
        if (now - cacheTimestamp < maxAgeMillis && cache.isNotEmpty()) return cache
        cache = compute(now)
        cacheTimestamp = now
        return cache
    }

    fun invalidate() {
        cacheTimestamp = 0L
    }

    /**
     * Packages ordered by when they were last in the foreground, most recent
     * first — the launcher's own answer to the task switcher.
     */
    fun recentlyUsedPackages(
        limit: Int = 15,
        lookbackMillis: Long = 24 * 60 * 60_000L,
    ): List<String> {
        val now = System.currentTimeMillis()
        val events = runCatching { usm.queryEvents(now - lookbackMillis, now) }.getOrNull()
            ?: return emptyList()
        val lastUsed = HashMap<String, Long>()
        val event = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == EVENT_FOREGROUND) {
                val pkg = event.packageName ?: continue
                lastUsed[pkg] = event.timeStamp
            }
        }
        return lastUsed.entries.sortedByDescending { it.value }.map { it.key }.take(limit)
    }

    private fun compute(now: Long): Map<String, Long> {
        val midnight = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis

        val events = usm.queryEvents(midnight, now) ?: return emptyMap()
        val totals = HashMap<String, Long>()
        val resumedAt = HashMap<String, Long>()
        val event = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val pkg = event.packageName ?: continue
            when (event.eventType) {
                EVENT_FOREGROUND -> resumedAt.putIfAbsent(pkg, event.timeStamp)
                EVENT_BACKGROUND -> {
                    val start = resumedAt.remove(pkg)
                    if (start != null) {
                        totals[pkg] = (totals[pkg] ?: 0L) + (event.timeStamp - start)
                    }
                }
            }
        }
        // Whatever is still resumed counts up to "now"
        for ((pkg, start) in resumedAt) {
            totals[pkg] = (totals[pkg] ?: 0L) + (now - start)
        }
        return totals
    }

    companion object {
        // Same values as ACTIVITY_RESUMED/ACTIVITY_PAUSED on API 29+, so one
        // pair of constants covers every supported Android version.
        @Suppress("DEPRECATION")
        private val EVENT_FOREGROUND = UsageEvents.Event.MOVE_TO_FOREGROUND

        @Suppress("DEPRECATION")
        private val EVENT_BACKGROUND = UsageEvents.Event.MOVE_TO_BACKGROUND

        @Volatile
        private var instance: UsageRepository? = null

        fun get(context: Context): UsageRepository =
            instance ?: synchronized(this) {
                instance ?: UsageRepository(context).also { instance = it }
            }
    }
}
