package io.github.minilauncher.ui.settings

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import io.github.minilauncher.App
import io.github.minilauncher.R
import io.github.minilauncher.data.AppRepository
import io.github.minilauncher.data.Prefs
import io.github.minilauncher.ui.common.BaseActivity
import io.github.minilauncher.ui.common.PermissionChecks
import io.github.minilauncher.ui.onboarding.OnboardingActivity
import io.github.minilauncher.ui.stats.StatsActivity

class SettingsActivity : BaseActivity() {

    private lateinit var prefs: Prefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)
        prefs = Prefs.get(this)
    }

    override fun onResume() {
        super.onResume()
        render()
    }

    private fun render() {
        val container = findViewById<LinearLayout>(R.id.settingsContainer)
        container.removeAllViews()

        section(container, getString(R.string.settings_section_focus))
        row(
            container,
            getString(R.string.settings_focus_mode),
            if (prefs.focusModeEnabled) getString(R.string.state_on) else getString(R.string.state_off),
        ) {
            prefs.focusModeEnabled = !prefs.focusModeEnabled
            render()
        }
        row(container, getString(R.string.settings_blocked_apps), prefs.blockedApps.size.toString()) {
            showAppMultiPicker(
                title = getString(R.string.settings_blocked_apps),
                selected = prefs.blockedApps,
            ) { prefs.blockedApps = it; render() }
        }
        row(container, getString(R.string.settings_schedules), prefs.schedules.size.toString()) {
            startActivity(Intent(this, ScheduleEditorActivity::class.java))
        }
        row(container, getString(R.string.settings_limits), prefs.limits.size.toString()) {
            showLimitsOverview()
        }
        row(
            container,
            getString(R.string.settings_five_more),
            if (prefs.allowFiveMoreMinutes) getString(R.string.state_on) else getString(R.string.state_off),
        ) {
            prefs.allowFiveMoreMinutes = !prefs.allowFiveMoreMinutes
            render()
        }
        row(
            container,
            getString(R.string.settings_nudge),
            if (prefs.nudgeIntervalMinutes == 0) getString(R.string.state_off)
            else getString(R.string.settings_nudge_value, prefs.nudgeIntervalMinutes),
        ) { showNudgePicker() }

        section(container, getString(R.string.settings_section_notifications))
        row(container, getString(R.string.settings_muted_apps), prefs.mutedApps.size.toString()) {
            if (!PermissionChecks.isNotificationListenerEnabled(this)) {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            } else {
                showAppMultiPicker(
                    title = getString(R.string.settings_muted_apps),
                    selected = prefs.mutedApps,
                ) { prefs.mutedApps = it; render() }
            }
        }

        section(container, getString(R.string.settings_section_appearance))
        row(container, getString(R.string.settings_theme), themeLabel()) { showThemePicker() }
        row(
            container,
            getString(R.string.settings_font_size),
            if (prefs.largeFont) getString(R.string.font_large) else getString(R.string.font_normal),
        ) {
            prefs.largeFont = !prefs.largeFont
            recreate()
        }
        row(
            container,
            getString(R.string.settings_grayscale),
            if (systemGrayscaleEnabled()) getString(R.string.state_on) else getString(R.string.state_off),
        ) { toggleSystemGrayscale() }

        section(container, getString(R.string.settings_section_launcher))
        row(container, getString(R.string.settings_hidden_apps), prefs.hiddenApps.size.toString()) {
            showAppMultiPicker(
                title = getString(R.string.settings_hidden_apps),
                selected = prefs.hiddenApps,
            ) { prefs.hiddenApps = it; render() }
        }
        row(container, getString(R.string.settings_stats), "") {
            startActivity(Intent(this, StatsActivity::class.java))
        }
        row(container, getString(R.string.settings_permissions), "") {
            startActivity(Intent(this, OnboardingActivity::class.java))
        }
        if (!PermissionChecks.isDefaultHome(this)) {
            row(container, getString(R.string.settings_set_default_home), "") {
                startActivity(PermissionChecks.requestDefaultHomeIntent(this))
            }
        }
    }

    private fun themeLabel(): String = when (prefs.theme) {
        Prefs.THEME_LIGHT -> getString(R.string.theme_light)
        Prefs.THEME_OLED -> getString(R.string.theme_oled)
        else -> getString(R.string.theme_dark)
    }

    private fun showThemePicker() {
        val values = arrayOf(Prefs.THEME_LIGHT, Prefs.THEME_DARK, Prefs.THEME_OLED)
        val labels = arrayOf(
            getString(R.string.theme_light),
            getString(R.string.theme_dark),
            getString(R.string.theme_oled),
        )
        AlertDialog.Builder(this)
            .setTitle(R.string.settings_theme)
            .setSingleChoiceItems(labels, values.indexOf(prefs.theme)) { dialog, which ->
                prefs.theme = values[which]
                App.applyNightMode(prefs.theme)
                dialog.dismiss()
                recreate()
            }
            .show()
    }

    private fun showNudgePicker() {
        val values = intArrayOf(0, 5, 10, 15, 30, 60)
        val labels = values.map {
            if (it == 0) getString(R.string.state_off) else getString(R.string.settings_nudge_value, it)
        }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle(R.string.settings_nudge)
            .setSingleChoiceItems(labels, values.indexOf(prefs.nudgeIntervalMinutes)) { dialog, which ->
                prefs.nudgeIntervalMinutes = values[which]
                dialog.dismiss()
                render()
            }
            .show()
    }

    private fun showLimitsOverview() {
        val repo = AppRepository(this)
        val limits = prefs.limits.toList().sortedBy { repo.labelFor(it.first).lowercase() }
        if (limits.isEmpty()) {
            AlertDialog.Builder(this)
                .setTitle(R.string.settings_limits)
                .setMessage(R.string.limits_empty_hint)
                .setPositiveButton(android.R.string.ok, null)
                .show()
            return
        }
        val labels = limits.map { (pkg, min) ->
            getString(R.string.limits_row, repo.labelFor(pkg), min)
        }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle(R.string.settings_limits)
            .setItems(labels) { _, which ->
                prefs.setLimit(limits[which].first, null)
                render()
            }
            .setPositiveButton(android.R.string.ok, null)
            .show()
    }

    private fun showAppMultiPicker(
        title: String,
        selected: Set<String>,
        onDone: (Set<String>) -> Unit,
    ) {
        val apps = AppRepository(this).allApps(includeHidden = true)
        val labels = apps.map { it.displayLabel }.toTypedArray()
        val checked = apps.map { it.packageName in selected }.toBooleanArray()
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMultiChoiceItems(labels, checked) { _, which, isChecked -> checked[which] = isChecked }
            .setPositiveButton(android.R.string.ok) { _, _ ->
                onDone(
                    apps.filterIndexed { index, _ -> checked[index] }
                        .map { it.packageName }
                        .toSet()
                )
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    // System-wide grayscale via the display daltonizer (monochromacy). Only
    // works after: adb shell pm grant io.github.minilauncher android.permission.WRITE_SECURE_SETTINGS
    private fun systemGrayscaleEnabled(): Boolean =
        Settings.Secure.getInt(contentResolver, "accessibility_display_daltonizer_enabled", 0) == 1 &&
            Settings.Secure.getInt(contentResolver, "accessibility_display_daltonizer", -1) == 0

    private fun toggleSystemGrayscale() {
        if (!PermissionChecks.hasWriteSecureSettings(this)) {
            AlertDialog.Builder(this)
                .setTitle(R.string.settings_grayscale)
                .setMessage(getString(R.string.grayscale_adb_hint, packageName))
                .setPositiveButton(android.R.string.ok, null)
                .show()
            return
        }
        val enable = !systemGrayscaleEnabled()
        runCatching {
            Settings.Secure.putInt(contentResolver, "accessibility_display_daltonizer_enabled", if (enable) 1 else 0)
            Settings.Secure.putInt(contentResolver, "accessibility_display_daltonizer", 0)
        }
        render()
    }

    private fun section(container: LinearLayout, title: String) {
        val view = layoutInflater.inflate(R.layout.item_section_header, container, false) as TextView
        view.text = title
        container.addView(view)
    }

    private fun row(container: LinearLayout, title: String, value: String, onClick: () -> Unit) {
        val view = layoutInflater.inflate(R.layout.item_setting_row, container, false)
        view.findViewById<TextView>(R.id.rowTitle).text = title
        view.findViewById<TextView>(R.id.rowValue).text = value
        view.setOnClickListener { onClick() }
        container.addView(view)
    }
}
