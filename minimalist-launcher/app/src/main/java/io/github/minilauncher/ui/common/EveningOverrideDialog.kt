package io.github.minilauncher.ui.common

import android.app.Activity
import androidx.appcompat.app.AlertDialog
import io.github.minilauncher.R
import io.github.minilauncher.data.Prefs

/**
 * Turns evening mode on temporarily — deliberately not a one-tap action: an
 * explicit confirmation comes first, then a duration. While an override runs,
 * the same entry point ends it instead.
 */
object EveningOverrideDialog {

    private val DURATIONS = intArrayOf(15, 30, 60)

    fun show(activity: Activity, onChanged: () -> Unit) {
        val prefs = Prefs.get(activity)
        if (prefs.eveningOverrideUntil > System.currentTimeMillis()) {
            AlertDialog.Builder(activity)
                .setTitle(R.string.override_end_title)
                .setPositiveButton(android.R.string.ok) { _, _ ->
                    prefs.eveningOverrideUntil = 0L
                    onChanged()
                }
                .setNegativeButton(android.R.string.cancel, null)
                .show()
            return
        }
        AlertDialog.Builder(activity)
            .setTitle(R.string.override_confirm_title)
            .setMessage(R.string.override_confirm_message)
            .setPositiveButton(R.string.override_confirm_yes) { _, _ ->
                showDurationPicker(activity, onChanged)
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun showDurationPicker(activity: Activity, onChanged: () -> Unit) {
        val labels = DURATIONS.map { activity.getString(R.string.override_minutes, it) }.toTypedArray()
        AlertDialog.Builder(activity)
            .setTitle(R.string.override_duration_title)
            .setItems(labels) { _, which ->
                // Stored as an end timestamp so it also expires while closed.
                Prefs.get(activity).eveningOverrideUntil =
                    System.currentTimeMillis() + DURATIONS[which] * 60_000L
                onChanged()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }
}
