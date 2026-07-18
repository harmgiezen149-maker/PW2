package io.github.minilauncher.data

import android.content.Context
import android.content.SharedPreferences
import io.github.minilauncher.data.model.Schedule
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * All persistent state, stored in a single SharedPreferences file. Structured
 * values are stored as JSON strings; everything is small config, so no
 * database is needed. Usage numbers are never persisted — they are always
 * recomputed from UsageStatsManager.
 */
class Prefs(context: Context) {

    private val sp: SharedPreferences =
        context.applicationContext.getSharedPreferences("minilauncher", Context.MODE_PRIVATE)

    // ---- launcher ----

    /** Ordered favorites for the home screen. */
    var favorites: List<String>
        get() = readStringList(KEY_FAVORITES)
        set(value) = writeStringList(KEY_FAVORITES, value)

    fun addFavorite(pkg: String) {
        if (pkg !in favorites) favorites = favorites + pkg
    }

    fun removeFavorite(pkg: String) {
        favorites = favorites - pkg
    }

    var hiddenApps: Set<String>
        get() = sp.getStringSet(KEY_HIDDEN, emptySet())!!.toSet()
        set(value) = sp.edit().putStringSet(KEY_HIDDEN, value).apply()

    /** package -> user-chosen display name */
    var renames: Map<String, String>
        get() = readStringMap(KEY_RENAMES)
        set(value) = writeStringMap(KEY_RENAMES, value)

    fun setRename(pkg: String, name: String?) {
        renames = if (name.isNullOrBlank()) renames - pkg else renames + (pkg to name)
    }

    // ---- blocking ----

    var blockedApps: Set<String>
        get() = sp.getStringSet(KEY_BLOCKED, emptySet())!!.toSet()
        set(value) = sp.edit().putStringSet(KEY_BLOCKED, value).apply()

    var focusModeEnabled: Boolean
        get() = sp.getBoolean(KEY_FOCUS_MODE, false)
        set(value) = sp.edit().putBoolean(KEY_FOCUS_MODE, value).apply()

    var schedules: List<Schedule>
        get() {
            val raw = sp.getString(KEY_SCHEDULES, null) ?: return emptyList()
            return runCatching {
                val arr = JSONArray(raw)
                buildList { for (i in 0 until arr.length()) add(Schedule.fromJson(arr.getJSONObject(i))) }
            }.getOrDefault(emptyList())
        }
        set(value) {
            val arr = JSONArray()
            value.forEach { arr.put(it.toJson()) }
            sp.edit().putString(KEY_SCHEDULES, arr.toString()).apply()
        }

    /** package -> daily limit in minutes */
    var limits: Map<String, Int>
        get() = readStringMap(KEY_LIMITS).mapValues { it.value.toIntOrNull() ?: 0 }
            .filterValues { it > 0 }
        set(value) = writeStringMap(KEY_LIMITS, value.mapValues { it.value.toString() })

    fun setLimit(pkg: String, minutes: Int?) {
        limits = if (minutes == null || minutes <= 0) limits - pkg else limits + (pkg to minutes)
    }

    /** package -> epoch millis until which the app is temporarily allowed */
    var tempAllowUntil: Map<String, Long>
        get() = readStringMap(KEY_TEMP_ALLOW).mapValues { it.value.toLongOrNull() ?: 0L }
        set(value) {
            // drop expired entries while writing to keep the map small
            val now = System.currentTimeMillis()
            writeStringMap(KEY_TEMP_ALLOW, value.filterValues { it > now }.mapValues { it.value.toString() })
        }

    fun allowTemporarily(pkg: String, untilMillis: Long) {
        tempAllowUntil = tempAllowUntil + (pkg to untilMillis)
    }

    /** Apps behind the mindful pause: breathing screen + chosen usage duration. */
    var mindfulApps: Set<String>
        get() = sp.getStringSet(KEY_MINDFUL, emptySet())!!.toSet()
        set(value) = sp.edit().putStringSet(KEY_MINDFUL, value).apply()

    /** Epoch millis until which a timed focus session runs (0 = none). */
    var focusSessionUntil: Long
        get() = sp.getLong(KEY_FOCUS_SESSION, 0L)
        set(value) = sp.edit().putLong(KEY_FOCUS_SESSION, value).apply()

    /** Pre-normalized hosts (see WebsiteMatcher.normalizeHost). */
    var blockedSites: Set<String>
        get() = sp.getStringSet(KEY_BLOCKED_SITES, emptySet())!!.toSet()
        set(value) = sp.edit().putStringSet(KEY_BLOCKED_SITES, value).apply()

    var allowFiveMoreMinutes: Boolean
        get() = sp.getBoolean(KEY_ALLOW_FIVE_MORE, true)
        set(value) = sp.edit().putBoolean(KEY_ALLOW_FIVE_MORE, value).apply()

    /** 0 = off */
    var nudgeIntervalMinutes: Int
        get() = sp.getInt(KEY_NUDGE_INTERVAL, 15)
        set(value) = sp.edit().putInt(KEY_NUDGE_INTERVAL, value).apply()

    // ---- notification filter ----

    var mutedApps: Set<String>
        get() = sp.getStringSet(KEY_MUTED, emptySet())!!.toSet()
        set(value) = sp.edit().putStringSet(KEY_MUTED, value).apply()

    /** Per-app count of notifications filtered today; resets on date change. */
    fun incrementFilteredCount(pkg: String) {
        val counts = filteredCountsToday().toMutableMap()
        counts[pkg] = (counts[pkg] ?: 0) + 1
        val json = JSONObject()
        counts.forEach { (k, v) -> json.put(k, v) }
        sp.edit()
            .putString(KEY_FILTERED_DATE, todayString())
            .putString(KEY_FILTERED_COUNTS, json.toString())
            .apply()
    }

    fun filteredCountsToday(): Map<String, Int> {
        if (sp.getString(KEY_FILTERED_DATE, null) != todayString()) return emptyMap()
        val raw = sp.getString(KEY_FILTERED_COUNTS, null) ?: return emptyMap()
        return runCatching {
            val o = JSONObject(raw)
            buildMap { o.keys().forEach { put(it, o.getInt(it)) } }
        }.getOrDefault(emptyMap())
    }

    // ---- appearance ----

    var theme: String
        get() = sp.getString(KEY_THEME, THEME_DARK)!!
        set(value) = sp.edit().putString(KEY_THEME, value).apply()

    var largeFont: Boolean
        get() = sp.getBoolean(KEY_LARGE_FONT, false)
        set(value) = sp.edit().putBoolean(KEY_LARGE_FONT, value).apply()

    var showDrawerHint: Boolean
        get() = sp.getBoolean(KEY_DRAWER_HINT, true)
        set(value) = sp.edit().putBoolean(KEY_DRAWER_HINT, value).apply()

    /** CRT-style green text instead of white/black. */
    var crtGreen: Boolean
        get() = sp.getBoolean(KEY_CRT_GREEN, false)
        set(value) = sp.edit().putBoolean(KEY_CRT_GREEN, value).apply()

    /** Bottom-corner shortcuts: SHORTCUT_DIALER or a package name. */
    var shortcutLeft: String
        get() = sp.getString(KEY_SHORTCUT_LEFT, SHORTCUT_DIALER)!!
        set(value) = sp.edit().putString(KEY_SHORTCUT_LEFT, value).apply()

    var shortcutRight: String
        get() = sp.getString(KEY_SHORTCUT_RIGHT, "com.google.android.gm")!!
        set(value) = sp.edit().putString(KEY_SHORTCUT_RIGHT, value).apply()

    // ---- onboarding ----

    var onboardingDone: Boolean
        get() = sp.getBoolean(KEY_ONBOARDING_DONE, false)
        set(value) = sp.edit().putBoolean(KEY_ONBOARDING_DONE, value).apply()

    // ---- helpers ----

    private fun todayString(): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    private fun readStringList(key: String): List<String> {
        val raw = sp.getString(key, null) ?: return emptyList()
        return runCatching {
            val arr = JSONArray(raw)
            buildList { for (i in 0 until arr.length()) add(arr.getString(i)) }
        }.getOrDefault(emptyList())
    }

    private fun writeStringList(key: String, value: List<String>) {
        sp.edit().putString(key, JSONArray(value).toString()).apply()
    }

    private fun readStringMap(key: String): Map<String, String> {
        val raw = sp.getString(key, null) ?: return emptyMap()
        return runCatching {
            val o = JSONObject(raw)
            buildMap { o.keys().forEach { put(it, o.getString(it)) } }
        }.getOrDefault(emptyMap())
    }

    private fun writeStringMap(key: String, value: Map<String, String>) {
        val json = JSONObject()
        value.forEach { (k, v) -> json.put(k, v) }
        sp.edit().putString(key, json.toString()).apply()
    }

    companion object {
        const val THEME_LIGHT = "light"
        const val THEME_DARK = "dark"
        const val THEME_OLED = "oled"
        const val SHORTCUT_DIALER = "dialer"

        private const val KEY_FAVORITES = "favorites"
        private const val KEY_HIDDEN = "hidden_apps"
        private const val KEY_RENAMES = "renames"
        private const val KEY_BLOCKED = "blocked_apps"
        private const val KEY_FOCUS_MODE = "focus_mode"
        private const val KEY_SCHEDULES = "schedules"
        private const val KEY_LIMITS = "limits"
        private const val KEY_TEMP_ALLOW = "temp_allow_until"
        private const val KEY_ALLOW_FIVE_MORE = "allow_five_more"
        private const val KEY_MINDFUL = "mindful_apps"
        private const val KEY_FOCUS_SESSION = "focus_session_until"
        private const val KEY_BLOCKED_SITES = "blocked_sites"
        private const val KEY_CRT_GREEN = "crt_green"
        private const val KEY_SHORTCUT_LEFT = "shortcut_left"
        private const val KEY_SHORTCUT_RIGHT = "shortcut_right"
        private const val KEY_NUDGE_INTERVAL = "nudge_interval_min"
        private const val KEY_MUTED = "muted_apps"
        private const val KEY_FILTERED_DATE = "filtered_date"
        private const val KEY_FILTERED_COUNTS = "filtered_counts"
        private const val KEY_THEME = "theme"
        private const val KEY_LARGE_FONT = "large_font"
        private const val KEY_DRAWER_HINT = "drawer_hint"
        private const val KEY_ONBOARDING_DONE = "onboarding_done"

        @Volatile
        private var instance: Prefs? = null

        fun get(context: Context): Prefs =
            instance ?: synchronized(this) {
                instance ?: Prefs(context).also { instance = it }
            }
    }
}
