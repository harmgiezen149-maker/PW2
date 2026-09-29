package io.github.minilauncher.ui.common

import android.app.AppOpsManager
import android.app.role.RoleManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import io.github.minilauncher.blocking.AppBlockerAccessibilityService

object PermissionChecks {

    fun isDefaultHome(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val rm = context.getSystemService(RoleManager::class.java)
            if (rm != null && rm.isRoleAvailable(RoleManager.ROLE_HOME)) {
                return rm.isRoleHeld(RoleManager.ROLE_HOME)
            }
        }
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        val res = context.packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
        return res?.activityInfo?.packageName == context.packageName
    }

    fun requestDefaultHomeIntent(context: Context): Intent {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val rm = context.getSystemService(RoleManager::class.java)
            if (rm != null && rm.isRoleAvailable(RoleManager.ROLE_HOME) &&
                !rm.isRoleHeld(RoleManager.ROLE_HOME)
            ) {
                return rm.createRequestRoleIntent(RoleManager.ROLE_HOME)
            }
        }
        return Intent(Settings.ACTION_HOME_SETTINGS)
    }

    fun hasUsageAccess(context: Context): Boolean {
        val appOps = context.getSystemService(AppOpsManager::class.java) ?: return false
        val mode = appOps.unsafeCheckOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.packageName,
        )
        return mode == AppOpsManager.MODE_ALLOWED
    }

    fun isAccessibilityEnabled(context: Context): Boolean {
        val expected = ComponentName(context, AppBlockerAccessibilityService::class.java)
        val enabled = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
        ) ?: return false
        return enabled.split(':').any {
            ComponentName.unflattenFromString(it) == expected
        }
    }

    fun isNotificationListenerEnabled(context: Context): Boolean =
        context.packageName in NotificationManagerCompat.getEnabledListenerPackages(context)

    fun canPostNotifications(context: Context): Boolean =
        NotificationManagerCompat.from(context).areNotificationsEnabled()

    fun canDrawOverlays(context: Context): Boolean = Settings.canDrawOverlays(context)

    fun hasWriteSecureSettings(context: Context): Boolean =
        context.checkSelfPermission(android.Manifest.permission.WRITE_SECURE_SETTINGS) ==
            PackageManager.PERMISSION_GRANTED

    /** Whether any blocking feature is configured but the service is off. */
    fun blockerConfiguredButDisabled(context: Context): Boolean {
        val prefs = io.github.minilauncher.data.Prefs.get(context)
        val configured = prefs.blockedApps.isNotEmpty() || prefs.limits.isNotEmpty() ||
            prefs.mindfulApps.isNotEmpty() || prefs.blockedSites.isNotEmpty()
        return configured && !isAccessibilityEnabled(context)
    }
}
