package io.github.minilauncher.notifications

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import io.github.minilauncher.data.Prefs

/**
 * Cancels notifications from apps the user muted. Note: this cancels rather
 * than truly intercepts, so on some devices a heads-up may flash briefly.
 * Ongoing notifications (music, navigation) are left alone.
 */
class NotificationFilterService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val prefs = Prefs.get(this)
        if (sbn.packageName !in prefs.mutedApps) return
        if (sbn.isOngoing || sbn.notification.flags and Notification.FLAG_FOREGROUND_SERVICE != 0) return
        runCatching {
            cancelNotification(sbn.key)
            prefs.incrementFilteredCount(sbn.packageName)
        }
    }
}
