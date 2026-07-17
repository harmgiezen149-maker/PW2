package io.github.minilauncher.data

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import io.github.minilauncher.data.model.AppEntry

/**
 * Lists launchable apps with the user's renames and hidden set applied.
 * Queried fresh on demand (the list is small); callers refresh in onResume.
 */
class AppRepository(private val context: Context) {

    private val prefs = Prefs.get(context)

    /** All launchable apps except this launcher itself, sorted by display label. */
    fun allApps(includeHidden: Boolean = false): List<AppEntry> {
        val pm = context.packageManager
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val resolved = pm.queryIntentActivities(intent, PackageManager.MATCH_ALL)
        val renames = prefs.renames
        val hidden = prefs.hiddenApps
        val favorites = prefs.favorites.toSet()
        return resolved
            .asSequence()
            .map { it.activityInfo }
            .filter { it.packageName != context.packageName }
            .distinctBy { it.packageName }
            .map { info ->
                val original = info.applicationInfo.loadLabel(pm).toString()
                AppEntry(
                    packageName = info.packageName,
                    originalLabel = original,
                    displayLabel = renames[info.packageName] ?: original,
                    isHidden = info.packageName in hidden,
                    isFavorite = info.packageName in favorites,
                )
            }
            .filter { includeHidden || !it.isHidden }
            .sortedBy { it.displayLabel.lowercase() }
            .toList()
    }

    /** Favorites in the user's chosen order, skipping uninstalled apps. */
    fun favoriteApps(): List<AppEntry> {
        val byPackage = allApps(includeHidden = true).associateBy { it.packageName }
        return prefs.favorites.mapNotNull { byPackage[it] }
    }

    fun labelFor(pkg: String): String {
        prefs.renames[pkg]?.let { return it }
        return runCatching {
            val pm = context.packageManager
            pm.getApplicationInfo(pkg, 0).loadLabel(pm).toString()
        }.getOrDefault(pkg)
    }

    fun launch(pkg: String): Boolean {
        val intent = context.packageManager.getLaunchIntentForPackage(pkg) ?: return false
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return true
    }
}
