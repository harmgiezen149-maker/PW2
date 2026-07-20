package io.github.minilauncher.ui.common

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.text.InputType
import android.widget.EditText
import androidx.appcompat.app.AlertDialog
import io.github.minilauncher.R
import io.github.minilauncher.data.Prefs
import io.github.minilauncher.data.model.AppEntry

/** Long-press menu on any app row: favorite, rename, hide, block, limit, info. */
object AppLongPressDialog {

    fun show(activity: Activity, entry: AppEntry, onChanged: () -> Unit) {
        val prefs = Prefs.get(activity)
        val pkg = entry.packageName
        val isBlocked = pkg in prefs.blockedApps
        val isMuted = pkg in prefs.mutedApps
        val limit = prefs.limits[pkg]

        val options = mutableListOf<Pair<String, () -> Unit>>()
        options += if (entry.isFavorite) {
            activity.getString(R.string.action_remove_favorite) to { prefs.removeFavorite(pkg) }
        } else {
            activity.getString(R.string.action_add_favorite) to { prefs.addFavorite(pkg) }
        }
        options += activity.getString(R.string.action_rename) to { showRename(activity, entry, onChanged) }
        options += if (entry.isHidden) {
            activity.getString(R.string.action_unhide) to { prefs.hiddenApps = prefs.hiddenApps - pkg }
        } else {
            activity.getString(R.string.action_hide) to { prefs.hiddenApps = prefs.hiddenApps + pkg }
        }
        options += if (isBlocked) {
            activity.getString(R.string.action_unblock) to { prefs.blockedApps = prefs.blockedApps - pkg }
        } else {
            activity.getString(R.string.action_block) to { prefs.blockedApps = prefs.blockedApps + pkg }
        }
        options += if (pkg in prefs.mindfulApps) {
            activity.getString(R.string.action_mindful_off) to { prefs.mindfulApps = prefs.mindfulApps - pkg }
        } else {
            activity.getString(R.string.action_mindful_on) to { prefs.mindfulApps = prefs.mindfulApps + pkg }
        }
        options += (limit?.let { activity.getString(R.string.action_edit_limit, it) }
            ?: activity.getString(R.string.action_set_limit)) to { showLimit(activity, entry, onChanged) }
        options += if (isMuted) {
            activity.getString(R.string.action_unmute) to { prefs.mutedApps = prefs.mutedApps - pkg }
        } else {
            activity.getString(R.string.action_mute) to { prefs.mutedApps = prefs.mutedApps + pkg }
        }
        options += if (pkg in prefs.nudgeExemptApps) {
            activity.getString(R.string.action_nudge_include) to {
                prefs.nudgeExemptApps = prefs.nudgeExemptApps - pkg
            }
        } else {
            activity.getString(R.string.action_nudge_exempt) to {
                prefs.nudgeExemptApps = prefs.nudgeExemptApps + pkg
            }
        }
        options += activity.getString(R.string.action_app_info) to {
            activity.startActivity(
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$pkg"))
            )
        }

        AlertDialog.Builder(activity)
            .setTitle(entry.displayLabel)
            .setItems(options.map { it.first }.toTypedArray()) { _, which ->
                options[which].second()
                onChanged()
            }
            .show()
    }

    private fun showRename(activity: Activity, entry: AppEntry, onChanged: () -> Unit) {
        val input = EditText(activity).apply {
            inputType = InputType.TYPE_CLASS_TEXT
            setText(entry.displayLabel)
            setSelection(text.length)
        }
        AlertDialog.Builder(activity)
            .setTitle(activity.getString(R.string.rename_title, entry.originalLabel))
            .setView(input)
            .setPositiveButton(android.R.string.ok) { _, _ ->
                val name = input.text.toString().trim()
                Prefs.get(activity).setRename(
                    entry.packageName,
                    if (name.isEmpty() || name == entry.originalLabel) null else name,
                )
                onChanged()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun showLimit(activity: Activity, entry: AppEntry, onChanged: () -> Unit) {
        val prefs = Prefs.get(activity)
        val input = EditText(activity).apply {
            inputType = InputType.TYPE_CLASS_NUMBER
            hint = activity.getString(R.string.limit_hint)
            prefs.limits[entry.packageName]?.let { setText(it.toString()) }
        }
        AlertDialog.Builder(activity)
            .setTitle(activity.getString(R.string.limit_title, entry.displayLabel))
            .setMessage(R.string.limit_message)
            .setView(input)
            .setPositiveButton(android.R.string.ok) { _, _ ->
                prefs.setLimit(entry.packageName, input.text.toString().toIntOrNull())
                onChanged()
            }
            .setNeutralButton(R.string.limit_remove) { _, _ ->
                prefs.setLimit(entry.packageName, null)
                onChanged()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }
}
