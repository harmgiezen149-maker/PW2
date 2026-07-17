package io.github.minilauncher.blocking

import android.accessibilityservice.AccessibilityService
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent
import io.github.minilauncher.R
import io.github.minilauncher.data.AppRepository
import io.github.minilauncher.data.Prefs
import io.github.minilauncher.data.model.BlockReason
import io.github.minilauncher.data.model.BlockedInfo
import io.github.minilauncher.data.model.Decision
import io.github.minilauncher.ui.blocked.BlockedActivity
import io.github.minilauncher.usage.UsageRepository
import java.time.LocalDateTime
import java.util.concurrent.Executors

/**
 * Watches window changes to detect the foreground app. When a blocked app
 * comes to the front: (1) jump home via GLOBAL_ACTION_HOME — reliable because
 * this launcher IS the home app — and (2) try to show BlockedActivity
 * directly; if background-launch restrictions swallow that,
 * HomeActivity.onResume picks up BlockState.pendingBlock as a fallback.
 */
class AppBlockerAccessibilityService : AccessibilityService() {

    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private val sessionTracker = SessionTracker()

    private lateinit var prefs: Prefs
    private lateinit var usage: UsageRepository

    override fun onServiceConnected() {
        super.onServiceConnected()
        prefs = Prefs.get(this)
        usage = UsageRepository.get(this)
        scheduleSessionCheck()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg == packageName || pkg in IGNORED_PACKAGES) return

        executor.execute { handleForeground(pkg) }
    }

    private fun handleForeground(pkg: String) {
        val decision = evaluate(pkg)
        if (decision is Decision.Block) {
            sessionTracker.reset()
            val label = AppRepository(this).labelFor(pkg)
            val info = BlockedInfo(pkg, decision.reason, decision.detail)
            BlockState.pendingBlock = info
            mainHandler.post {
                performGlobalAction(GLOBAL_ACTION_HOME)
                runCatching {
                    startActivity(BlockedActivity.intent(this, info, label))
                }
            }
        } else {
            // Only track real, launchable-app sessions for nudges
            sessionTracker.onForeground(pkg)
            maybeNudge()
        }
    }

    private fun evaluate(pkg: String): Decision {
        val now = System.currentTimeMillis()
        val dateTime = LocalDateTime.now()
        val config = BlockDecisionEngine.Config(
            blockedApps = prefs.blockedApps,
            focusModeEnabled = prefs.focusModeEnabled,
            schedules = prefs.schedules,
            limits = prefs.limits,
            tempAllowUntil = prefs.tempAllowUntil,
        )
        return BlockDecisionEngine.evaluate(
            packageName = pkg,
            config = config,
            nowMillis = now,
            dayOfWeek = dateTime.dayOfWeek.value,
            minuteOfDay = dateTime.hour * 60 + dateTime.minute,
            usageTodayMillis = { usage.todayUsageMillis(it) },
        )
    }

    /** Re-check the current session every minute for nudges and limit crossings. */
    private fun scheduleSessionCheck() {
        mainHandler.postDelayed({
            executor.execute {
                sessionTracker.currentPackage?.let { pkg ->
                    usage.invalidate()
                    handleForeground(pkg)
                }
            }
            scheduleSessionCheck()
        }, 60_000L)
    }

    private fun maybeNudge() {
        val interval = prefs.nudgeIntervalMinutes
        val milestone = sessionTracker.dueNudgeMinutes(interval) ?: return
        val pkg = sessionTracker.currentPackage ?: return
        val label = AppRepository(this).labelFor(pkg)
        postNudgeNotification(label, milestone)
    }

    private fun postNudgeNotification(appLabel: String, minutes: Int) {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(
                NUDGE_CHANNEL,
                getString(R.string.nudge_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT,
            )
        )
        val notification = Notification.Builder(this, NUDGE_CHANNEL)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(getString(R.string.nudge_title, appLabel))
            .setContentText(getString(R.string.nudge_text, minutes))
            .setAutoCancel(true)
            .build()
        runCatching { nm.notify(pkgHash(appLabel), notification) }
    }

    private fun pkgHash(s: String): Int = 0x4E55 + (s.hashCode() and 0xFFFF)

    override fun onInterrupt() {
        // no-op
    }

    override fun onDestroy() {
        mainHandler.removeCallbacksAndMessages(null)
        executor.shutdown()
        super.onDestroy()
    }

    companion object {
        private const val NUDGE_CHANNEL = "nudges"

        private val IGNORED_PACKAGES = setOf(
            "com.android.systemui",
            "android",
        )
    }
}
