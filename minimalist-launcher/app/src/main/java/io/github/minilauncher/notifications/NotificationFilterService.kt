package io.github.minilauncher.notifications

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import io.github.minilauncher.data.Prefs
import io.github.minilauncher.data.model.AppVisibility
import io.github.minilauncher.mode.NotificationPolicy

/**
 * Cancels notifications from apps the user muted, and from apps whose
 * day/evening notification window does not include the current mode. Note:
 * this cancels rather than truly intercepts, so on some devices a heads-up may
 * flash briefly, and a notification blocked during the day is dismissed, not
 * held back until the evening. Ongoing notifications (music, navigation) are
 * left alone.
 */
class NotificationFilterService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val prefs = Prefs.get(this)
        val pkg = sbn.packageName
        val alwaysMuted = pkg in prefs.mutedApps
        val window = prefs.notificationWindowFor(pkg)
        // Fast path: nothing configured for this app.
        if (!alwaysMuted && window == AppVisibility.ALWAYS) return

        val allowed = NotificationPolicy.isAllowed(
            alwaysMuted = alwaysMuted,
            window = window,
            state = prefs.currentModeState(),
        )
        if (allowed) return
        if (sbn.isOngoing || sbn.notification.flags and Notification.FLAG_FOREGROUND_SERVICE != 0) return
        runCatching {
            cancelNotification(sbn.key)
            prefs.incrementFilteredCount(pkg)
        }
    }
}
