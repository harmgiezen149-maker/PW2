package io.github.minilauncher.ui.blocked

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import io.github.minilauncher.R
import io.github.minilauncher.data.AppRepository
import io.github.minilauncher.data.Prefs
import io.github.minilauncher.data.model.BlockReason
import io.github.minilauncher.ui.common.BaseActivity
import io.github.minilauncher.ui.common.PermissionChecks
import io.github.minilauncher.usage.UsageRepository

/** Full-screen intervention shown instead of a blocked app. */
class BlockedActivity : BaseActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_blocked)

        val pkg = intent.getStringExtra(EXTRA_PACKAGE) ?: run { finish(); return }
        val label = intent.getStringExtra(EXTRA_LABEL) ?: pkg
        val reason = intent.getStringExtra(EXTRA_REASON)?.let { BlockReason.valueOf(it) }
            ?: BlockReason.FOCUS_MODE
        val detail = intent.getStringExtra(EXTRA_DETAIL).orEmpty()
        val prefs = Prefs.get(this)

        findViewById<TextView>(R.id.blockedAppName).text =
            if (reason == BlockReason.WEBSITE) detail else label
        findViewById<TextView>(R.id.blockedReason).text = when (reason) {
            BlockReason.FOCUS_MODE -> getString(R.string.blocked_reason_focus)
            BlockReason.SCHEDULE ->
                if (detail.isNotEmpty()) getString(R.string.blocked_reason_schedule, detail)
                else getString(R.string.blocked_reason_schedule_generic)
            BlockReason.LIMIT -> getString(R.string.blocked_reason_limit, detail)
            // MINDFUL normally routes to PauseActivity; defensive fallback text
            BlockReason.MINDFUL -> getString(R.string.blocked_reason_mindful)
            BlockReason.WEBSITE -> getString(R.string.blocked_reason_website)
        }

        val usageView = findViewById<TextView>(R.id.blockedUsage)
        if (reason != BlockReason.WEBSITE && PermissionChecks.hasUsageAccess(this)) {
            val minutes = UsageRepository.get(this).todayUsageMillis(pkg) / 60_000L
            usageView.text = getString(R.string.blocked_usage_today, minutes)
        } else {
            usageView.visibility = View.GONE
        }

        findViewById<TextView>(R.id.backButton).setOnClickListener { finish() }

        val fiveMore = findViewById<TextView>(R.id.fiveMoreButton)
        if (prefs.allowFiveMoreMinutes) {
            fiveMore.setOnClickListener {
                if (reason == BlockReason.WEBSITE) {
                    // Site allowances live under a "site:" key: colons are illegal
                    // in package names, so this can never collide with app rules.
                    prefs.allowTemporarily("site:$detail", System.currentTimeMillis() + 5 * 60_000L)
                } else {
                    prefs.allowTemporarily(pkg, System.currentTimeMillis() + 5 * 60_000L)
                }
                AppRepository(this).launch(pkg)
                finish()
            }
        } else {
            fiveMore.visibility = View.GONE
        }
    }

    companion object {
        private const val EXTRA_PACKAGE = "package"
        private const val EXTRA_LABEL = "label"
        private const val EXTRA_REASON = "reason"
        private const val EXTRA_DETAIL = "detail"

        fun intent(
            context: Context,
            info: io.github.minilauncher.data.model.BlockedInfo,
            label: String,
        ): Intent = Intent(context, BlockedActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            .putExtra(EXTRA_PACKAGE, info.packageName)
            .putExtra(EXTRA_LABEL, label)
            .putExtra(EXTRA_REASON, info.reason.name)
            .putExtra(EXTRA_DETAIL, info.detail)
    }
}
