package io.github.minilauncher.ui.onboarding

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import io.github.minilauncher.R
import io.github.minilauncher.data.Prefs
import io.github.minilauncher.ui.common.BaseActivity
import io.github.minilauncher.ui.common.PermissionChecks

/**
 * Permission checklist. Every step is re-checked in onResume; all steps are
 * optional except that launcher duties need the default-home role. Features
 * degrade gracefully when a permission is missing.
 */
class OnboardingActivity : BaseActivity() {

    private val roleRequest =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { }

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_onboarding)
        findViewById<TextView>(R.id.doneButton).setOnClickListener {
            Prefs.get(this).onboardingDone = true
            finish()
        }
    }

    override fun onResume() {
        super.onResume()
        render()
    }

    private fun render() {
        val container = findViewById<LinearLayout>(R.id.stepsContainer)
        container.removeAllViews()

        step(
            container,
            getString(R.string.onboarding_home_title),
            getString(R.string.onboarding_home_desc),
            PermissionChecks.isDefaultHome(this),
        ) { roleRequest.launch(PermissionChecks.requestDefaultHomeIntent(this)) }

        step(
            container,
            getString(R.string.onboarding_usage_title),
            getString(R.string.onboarding_usage_desc),
            PermissionChecks.hasUsageAccess(this),
        ) { startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)) }

        step(
            container,
            getString(R.string.onboarding_accessibility_title),
            getString(R.string.onboarding_accessibility_desc),
            PermissionChecks.isAccessibilityEnabled(this),
        ) { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }

        step(
            container,
            getString(R.string.onboarding_notif_listener_title),
            getString(R.string.onboarding_notif_listener_desc),
            PermissionChecks.isNotificationListenerEnabled(this),
        ) { startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            step(
                container,
                getString(R.string.onboarding_post_notif_title),
                getString(R.string.onboarding_post_notif_desc),
                PermissionChecks.canPostNotifications(this),
            ) { notificationPermission.launch(android.Manifest.permission.POST_NOTIFICATIONS) }
        }

        step(
            container,
            getString(R.string.onboarding_overlay_title),
            getString(R.string.onboarding_overlay_desc),
            PermissionChecks.canDrawOverlays(this),
        ) {
            startActivity(
                Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName"),
                )
            )
        }
    }

    private fun step(
        container: LinearLayout,
        title: String,
        description: String,
        granted: Boolean,
        onClick: () -> Unit,
    ) {
        val view = layoutInflater.inflate(R.layout.item_onboarding_step, container, false)
        view.findViewById<TextView>(R.id.stepTitle).text =
            if (granted) getString(R.string.onboarding_step_done, title) else title
        view.findViewById<TextView>(R.id.stepDescription).text = description
        val action = view.findViewById<TextView>(R.id.stepAction)
        if (granted) {
            action.text = getString(R.string.onboarding_granted)
            action.isEnabled = false
        } else {
            action.text = getString(R.string.onboarding_grant)
            action.setOnClickListener { onClick() }
        }
        container.addView(view)
    }
}
