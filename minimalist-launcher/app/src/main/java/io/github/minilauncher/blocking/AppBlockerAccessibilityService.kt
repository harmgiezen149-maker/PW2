package io.github.minilauncher.blocking

import android.accessibilityservice.AccessibilityService
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityWindowInfo
import io.github.minilauncher.R
import io.github.minilauncher.data.AppRepository
import io.github.minilauncher.data.Prefs
import io.github.minilauncher.data.model.BlockReason
import io.github.minilauncher.data.model.BlockedInfo
import io.github.minilauncher.data.model.Decision
import io.github.minilauncher.ui.common.AppLauncher
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
    private val launchableCache = java.util.concurrent.ConcurrentHashMap<String, Boolean>()
    private var homePackages: Set<String> = emptySet()

    private lateinit var prefs: Prefs
    private lateinit var usage: UsageRepository

    private val screenOffReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: android.content.Context, intent: android.content.Intent) {
            sessionTracker.reset()
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        prefs = Prefs.get(this)
        usage = UsageRepository.get(this)
        instance = this
        homePackages = queryHomePackages()
        launchableCache.clear()
        registerReceiver(
            screenOffReceiver,
            android.content.IntentFilter(android.content.Intent.ACTION_SCREEN_OFF),
        )
        scheduleSessionCheck()
    }

    override fun onUnbind(intent: android.content.Intent?): Boolean {
        instance = null
        runCatching { unregisterReceiver(screenOffReceiver) }
        return super.onUnbind(intent)
    }

    private fun queryHomePackages(): Set<String> {
        val intent = android.content.Intent(android.content.Intent.ACTION_MAIN)
            .addCategory(android.content.Intent.CATEGORY_HOME)
        return packageManager.queryIntentActivities(intent, 0)
            .map { it.activityInfo.packageName }
            .toSet()
    }

    /**
     * Time reminders should only count real apps the user opens — not the
     * keyboard, One UI's recents/home surfaces or other system windows that
     * briefly come to the foreground.
     */
    private fun isTrackableApp(pkg: String): Boolean {
        if (pkg in homePackages) return false
        return launchableCache.getOrPut(pkg) {
            runCatching { packageManager.getLaunchIntentForPackage(pkg) != null }
                .getOrDefault(false)
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        val pkg = event.packageName?.toString() ?: return
        if (SystemSurfaces.isSystemSurface(pkg, homePackages, packageName)) return

        // The recent-apps overview shows live windows of open apps. Without
        // this check we would read those as "the user just opened that app"
        // and send the user home, emptying the task switcher under them.
        if (!isActiveAppWindow(event, pkg)) return

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                executor.execute { handleForeground(pkg) }
                maybeCheckUrl(pkg) // catches tab switches too
            }
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> maybeCheckUrl(pkg)
            else -> return
        }
    }

    /**
     * Whether this event comes from the application window the user is
     * actually interacting with, as opposed to a system surface or an app
     * window sitting behind the task switcher. Runs on the service main
     * thread, where accessibility windows are safe to inspect.
     */
    private fun isActiveAppWindow(event: AccessibilityEvent, pkg: String): Boolean {
        val windowList = runCatching { windows }.getOrNull()
        if (!windowList.isNullOrEmpty()) {
            val window = windowList.firstOrNull { it.id == event.windowId } ?: return false
            if (window.type != AccessibilityWindowInfo.TYPE_APPLICATION) return false
            if (!window.isActive) return false
        }
        val activePackage = runCatching { rootInActiveWindow?.packageName?.toString() }.getOrNull()
        return activePackage == null || activePackage == pkg
    }

    // ---- website blocker ----

    private var lastUrlCheckMillis = 0L
    private var lastSiteBlockMillis = 0L

    /**
     * Reads the browser's address bar and blocks matching sites. Must run on
     * the service main thread: accessibility nodes go stale across threads.
     */
    private fun maybeCheckUrl(pkg: String) {
        val viewId = BROWSER_URL_BARS[pkg] ?: return
        val now = SystemClock.uptimeMillis()
        if (now - lastUrlCheckMillis < 500) return
        lastUrlCheckMillis = now
        val sites = prefs.blockedSites
        if (sites.isEmpty()) return
        val root = rootInActiveWindow ?: return
        // Only read the address bar of the browser that is genuinely in front.
        if (root.packageName?.toString() != pkg) return
        val text = runCatching {
            root.findAccessibilityNodeInfosByViewId(viewId)?.firstOrNull()?.text?.toString()
        }.getOrNull() ?: return
        val matched = WebsiteMatcher.matchesBlockedSite(text, sites) ?: return
        if ((prefs.tempAllowUntil["site:$matched"] ?: 0L) > System.currentTimeMillis()) return
        handleBlockedSite(pkg, matched)
    }

    private fun handleBlockedSite(pkg: String, site: String) {
        // Cooldown: BACK itself triggers a burst of content events
        if (SystemClock.uptimeMillis() - lastSiteBlockMillis < 2000) return
        lastSiteBlockMillis = SystemClock.uptimeMillis()
        val info = BlockedInfo(pkg, BlockReason.WEBSITE, site)
        BlockState.pendingBlock = info
        // BACK navigates the browser off the blocked page so returning to it
        // does not re-trigger. It is only safe while that browser really is in
        // front — sending it blindly can close tasks the user still wants.
        val browserInFront = runCatching {
            rootInActiveWindow?.packageName?.toString() == pkg
        }.getOrDefault(false)
        if (browserInFront) performGlobalAction(GLOBAL_ACTION_BACK)
        performGlobalAction(GLOBAL_ACTION_HOME)
        runCatching {
            startActivity(AppLauncher.blockIntent(this, info, AppRepository(this).labelFor(pkg)))
        }
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
                    startActivity(AppLauncher.blockIntent(this, info, label))
                }
            }
        } else if (isTrackableApp(pkg)) {
            // Only real, launchable apps count toward time-reminder sessions;
            // keyboard/system windows neither start nor reset a session.
            sessionTracker.onForeground(pkg)
            maybeNudge()
        }
    }

    private fun evaluate(pkg: String): Decision {
        val now = System.currentTimeMillis()
        val dateTime = LocalDateTime.now()
        val config = AppLauncher.configFrom(prefs)
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
            val pm = getSystemService(android.os.PowerManager::class.java)
            if (pm == null || pm.isInteractive) {
                executor.execute {
                    sessionTracker.currentPackage?.let { pkg ->
                        usage.invalidate()
                        handleForeground(pkg)
                    }
                }
            }
            scheduleSessionCheck()
        }, 60_000L)
    }

    private fun maybeNudge() {
        val interval = prefs.nudgeIntervalMinutes
        val pkg = sessionTracker.currentPackage ?: return
        if (pkg in prefs.nudgeExemptApps) return
        val milestone = sessionTracker.dueNudgeMinutes(interval) ?: return
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
        instance = null
        runCatching { unregisterReceiver(screenOffReceiver) }
        mainHandler.removeCallbacksAndMessages(null)
        executor.shutdown()
        super.onDestroy()
    }

    companion object {
        private const val NUDGE_CHANNEL = "nudges"

        // Best-effort address-bar view IDs for common browsers; unknown
        // browsers simply aren't URL-checked.
        private val BROWSER_URL_BARS = mapOf(
            "com.android.chrome" to "com.android.chrome:id/url_bar",
            "com.chrome.beta" to "com.chrome.beta:id/url_bar",
            "com.brave.browser" to "com.brave.browser:id/url_bar",
            "com.microsoft.emmx" to "com.microsoft.emmx:id/url_bar",
            "com.vivaldi.browser" to "com.vivaldi.browser:id/url_bar",
            "com.sec.android.app.sbrowser" to "com.sec.android.app.sbrowser:id/location_bar_edit_text",
            "org.mozilla.firefox" to "org.mozilla.firefox:id/mozac_browser_toolbar_url_view",
            "org.mozilla.focus" to "org.mozilla.focus:id/mozac_browser_toolbar_url_view",
            "com.duckduckgo.mobile.android" to "com.duckduckgo.mobile.android:id/omnibarTextInput",
            "com.opera.browser" to "com.opera.browser:id/url_field",
        )

        @Volatile
        private var instance: AppBlockerAccessibilityService? = null

        /** Used by the home screen's swipe-down gesture; false when the service is off. */
        fun openNotificationShade(): Boolean =
            instance?.performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS) ?: false
    }
}
