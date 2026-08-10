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
import io.github.minilauncher.ui.common.AppLongPressDialog
import io.github.minilauncher.ui.common.BaseActivity
import io.github.minilauncher.ui.common.EveningOverrideDialog
import io.github.minilauncher.ui.common.PermissionChecks
import io.github.minilauncher.ui.diagnostics.DiagnosticsActivity
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
        row(container, getString(R.string.settings_mindful_apps), prefs.mindfulApps.size.toString()) {
            showAppMultiPicker(
                title = getString(R.string.settings_mindful_apps),
                selected = prefs.mindfulApps,
            ) { prefs.mindfulApps = it; render() }
        }
        val sessionActive = prefs.focusSessionUntil > System.currentTimeMillis()
        row(
            container,
            getString(R.string.settings_focus_session),
            if (sessionActive) {
                val minutes = ((prefs.focusSessionUntil - System.currentTimeMillis() + 59_999) / 60_000L).toInt()
                getString(R.string.focus_session_remaining, minutes)
            } else {
                getString(R.string.state_off)
            },
        ) {
            if (sessionActive) {
                AlertDialog.Builder(this)
                    .setTitle(R.string.focus_session_cancel_title)
                    .setPositiveButton(android.R.string.ok) { _, _ ->
                        prefs.focusSessionUntil = 0L
                        render()
                    }
                    .setNegativeButton(android.R.string.cancel, null)
                    .show()
            } else {
                showFocusSessionPicker()
            }
        }
        row(container, getString(R.string.settings_blocked_sites), prefs.blockedSites.size.toString()) {
            showBlockedSites()
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
        row(
            container,
            getString(R.string.settings_nudge_exempt),
            prefs.nudgeExemptApps.size.toString(),
        ) {
            showAppMultiPicker(
                title = getString(R.string.settings_nudge_exempt),
                selected = prefs.nudgeExemptApps,
            ) { prefs.nudgeExemptApps = it; render() }
        }

        section(container, getString(R.string.settings_section_mode))
        row(
            container,
            getString(R.string.settings_mode_enabled),
            if (prefs.dayEveningEnabled) getString(R.string.state_on) else getString(R.string.state_off),
        ) {
            prefs.dayEveningEnabled = !prefs.dayEveningEnabled
            render()
        }
        if (prefs.dayEveningEnabled) {
            row(
                container,
                getString(R.string.settings_evening_start),
                formatMinute(prefs.eveningStartMinute),
            ) {
                pickTime(prefs.eveningStartMinute) { prefs.eveningStartMinute = it; render() }
            }
            row(
                container,
                getString(R.string.settings_evening_end),
                formatMinute(prefs.eveningEndMinute),
            ) {
                pickTime(prefs.eveningEndMinute) { prefs.eveningEndMinute = it; render() }
            }
            row(
                container,
                getString(R.string.settings_app_visibility),
                prefs.appVisibility.size.toString(),
            ) { showAppVisibilityList() }
            row(
                container,
                getString(R.string.settings_notification_windows),
                prefs.notificationWindows.size.toString(),
            ) { showNotificationWindowList() }
            val overrideActive = prefs.eveningOverrideUntil > System.currentTimeMillis()
            row(
                container,
                getString(R.string.settings_evening_override),
                if (overrideActive) {
                    getString(
                        R.string.focus_session_remaining,
                        prefs.currentModeState().overrideRemainingMinutes,
                    )
                } else {
                    getString(R.string.state_off)
                },
            ) { EveningOverrideDialog.show(this) { render() } }
        }

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
            getString(R.string.settings_text_color),
            if (prefs.crtGreen) getString(R.string.text_green) else getString(R.string.text_white),
        ) {
            prefs.crtGreen = !prefs.crtGreen
            recreate()
        }
        row(container, getString(R.string.settings_alignment), alignmentLabel()) { showAlignmentPicker() }
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
        row(
            container,
            getString(R.string.settings_recent_apps),
            if (prefs.recentAppsEnabled) getString(R.string.state_on) else getString(R.string.state_off),
        ) {
            prefs.recentAppsEnabled = !prefs.recentAppsEnabled
            render()
        }
        row(container, getString(R.string.settings_stats), "") {
            startActivity(Intent(this, StatsActivity::class.java))
        }
        row(container, getString(R.string.settings_permissions), "") {
            startActivity(Intent(this, OnboardingActivity::class.java))
        }
        row(container, getString(R.string.diagnostics_title), "") {
            startActivity(Intent(this, DiagnosticsActivity::class.java))
        }
        if (!PermissionChecks.isDefaultHome(this)) {
            row(container, getString(R.string.settings_set_default_home), "") {
                startActivity(PermissionChecks.requestDefaultHomeIntent(this))
            }
        }
    }

    private fun themeLabel(): String = when (prefs.theme) {
        Prefs.THEME_LIGHT -> getString(R.string.theme_light)
        else -> getString(R.string.theme_black)
    }

    private fun showThemePicker() {
        // Legacy "dark"/"oled" values both mean Black (pure #000000)
        val values = arrayOf(Prefs.THEME_LIGHT, Prefs.THEME_OLED)
        val labels = arrayOf(getString(R.string.theme_light), getString(R.string.theme_black))
        val checked = if (prefs.theme == Prefs.THEME_LIGHT) 0 else 1
        AlertDialog.Builder(this)
            .setTitle(R.string.settings_theme)
            .setSingleChoiceItems(labels, checked) { dialog, which ->
                prefs.theme = values[which]
                App.applyNightMode(prefs.theme)
                dialog.dismiss()
                recreate()
            }
            .show()
    }

    private fun formatMinute(minute: Int): String = "%02d:%02d".format(minute / 60, minute % 60)

    private fun pickTime(currentMinute: Int, onPicked: (Int) -> Unit) {
        android.app.TimePickerDialog(
            this,
            { _, hour, minute -> onPicked(hour * 60 + minute) },
            currentMinute / 60,
            currentMinute % 60,
            true,
        ).show()
    }

    /**
     * Every app with its day/evening visibility; tap one to change it. After a
     * change the list reopens scrolled to [focusPackage], so several apps can
     * be set in a row without hunting through the list again.
     */
    private fun showAppVisibilityList(focusPackage: String? = null) {
        val apps = AppRepository(this).allApps(includeHidden = true, respectMode = false)
        val labels = apps.map {
            getString(
                R.string.app_visibility_row,
                it.displayLabel,
                AppLongPressDialog.visibilityLabel(this, prefs.visibilityFor(it.packageName)),
            )
        }.toTypedArray()
        val dialog = AlertDialog.Builder(this)
            .setTitle(R.string.settings_app_visibility)
            .setItems(labels) { _, which ->
                val pkg = apps[which].packageName
                AppLongPressDialog.showVisibilityPicker(this, apps[which]) {
                    render()
                    showAppVisibilityList(focusPackage = pkg)
                }
            }
            .setPositiveButton(android.R.string.ok, null)
            .create()
        dialog.show()
        scrollToApp(dialog, apps.indexOfFirst { it.packageName == focusPackage })
    }

    /** Keeps the just-configured app in view when a picker list reopens. */
    private fun scrollToApp(dialog: AlertDialog, index: Int) {
        if (index < 0) return
        val list = dialog.listView ?: return
        list.post {
            // Roughly a third down, so it reads as "still where you were".
            list.setSelectionFromTop(index, list.height / 3)
        }
    }

    /** Every app with its notification window; tap one to change it. */
    private fun showNotificationWindowList(focusPackage: String? = null) {
        // Only warn when opening the list, not on every reopen after a change.
        if (focusPackage == null && !PermissionChecks.isNotificationListenerEnabled(this)) {
            android.widget.Toast.makeText(
                this,
                R.string.notification_windows_needs_access,
                android.widget.Toast.LENGTH_LONG,
            ).show()
        }
        val apps = AppRepository(this).allApps(includeHidden = true, respectMode = false)
        val labels = apps.map {
            getString(
                R.string.app_visibility_row,
                it.displayLabel,
                AppLongPressDialog.notificationWindowLabel(
                    this,
                    prefs.notificationWindowFor(it.packageName),
                ),
            )
        }.toTypedArray()
        val dialog = AlertDialog.Builder(this)
            .setTitle(R.string.settings_notification_windows)
            .setItems(labels) { _, which ->
                val pkg = apps[which].packageName
                AppLongPressDialog.showNotificationWindowPicker(this, apps[which]) {
                    render()
                    showNotificationWindowList(focusPackage = pkg)
                }
            }
            .setPositiveButton(android.R.string.ok, null)
            .create()
        dialog.show()
        scrollToApp(dialog, apps.indexOfFirst { it.packageName == focusPackage })
    }

    private fun alignmentLabel(): String = when (prefs.alignment) {
        Prefs.ALIGN_CENTER -> getString(R.string.align_center)
        Prefs.ALIGN_RIGHT -> getString(R.string.align_right)
        else -> getString(R.string.align_left)
    }

    private fun showAlignmentPicker() {
        val values = arrayOf(Prefs.ALIGN_LEFT, Prefs.ALIGN_CENTER, Prefs.ALIGN_RIGHT)
        val labels = arrayOf(
            getString(R.string.align_left),
            getString(R.string.align_center),
            getString(R.string.align_right),
        )
        AlertDialog.Builder(this)
            .setTitle(R.string.settings_alignment)
            .setSingleChoiceItems(labels, values.indexOf(prefs.alignment)) { dialog, which ->
                prefs.alignment = values[which]
                dialog.dismiss()
                render()
            }
            .show()
    }

    private fun showFocusSessionPicker() {
        val values = intArrayOf(15, 25, 45, 60)
        val labels = values.map { getString(R.string.settings_nudge_value, it) }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle(R.string.settings_focus_session)
            .setItems(labels) { _, which ->
                prefs.focusSessionUntil = System.currentTimeMillis() + values[which] * 60_000L
                render()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun showBlockedSites() {
        val sites = prefs.blockedSites.sorted()
        val builder = AlertDialog.Builder(this)
            .setTitle(R.string.settings_blocked_sites)
            .setNeutralButton(R.string.blocked_sites_add) { _, _ -> showAddSite() }
            .setPositiveButton(android.R.string.ok, null)
        if (sites.isEmpty()) {
            builder.setMessage(R.string.blocked_sites_empty)
        } else {
            builder.setItems(
                sites.map { getString(R.string.blocked_sites_row, it) }.toTypedArray()
            ) { _, which ->
                prefs.blockedSites = prefs.blockedSites - sites[which]
                render()
            }
        }
        builder.show()
    }

    private fun showAddSite() {
        val input = android.widget.EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_TEXT or
                android.text.InputType.TYPE_TEXT_VARIATION_URI
            hint = getString(R.string.blocked_sites_hint)
        }
        AlertDialog.Builder(this)
            .setTitle(R.string.blocked_sites_add)
            .setView(input)
            .setPositiveButton(android.R.string.ok) { _, _ ->
                val host = io.github.minilauncher.blocking.WebsiteMatcher.normalizeHost(input.text.toString())
                if (host == null) {
                    android.widget.Toast.makeText(
                        this, R.string.blocked_sites_invalid, android.widget.Toast.LENGTH_SHORT
                    ).show()
                } else {
                    prefs.blockedSites = prefs.blockedSites + host
                }
                render()
            }
            .setNegativeButton(android.R.string.cancel, null)
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
        val apps = AppRepository(this).allApps(includeHidden = true, respectMode = false)
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
