package io.github.minilauncher.ui.stats

import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import io.github.minilauncher.R
import io.github.minilauncher.data.AppRepository
import io.github.minilauncher.data.Prefs
import io.github.minilauncher.ui.common.BaseActivity
import io.github.minilauncher.ui.common.PermissionChecks
import io.github.minilauncher.ui.onboarding.OnboardingActivity
import io.github.minilauncher.usage.UsageRepository

/** Today's screen time per app plus the filtered-notification summary. */
class StatsActivity : BaseActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_stats)
    }

    override fun onResume() {
        super.onResume()
        render()
    }

    private fun render() {
        val container = findViewById<LinearLayout>(R.id.statsContainer)
        container.removeAllViews()
        val repo = AppRepository(this)

        if (!PermissionChecks.hasUsageAccess(this)) {
            addRow(container, getString(R.string.stats_no_permission), bold = false)
            addRow(container, getString(R.string.stats_grant_permission), bold = true) {
                startActivity(android.content.Intent(this, OnboardingActivity::class.java))
            }
        } else {
            UsageRepository.get(this).invalidate()
            val usage = UsageRepository.get(this).todayUsageByPackage()
            val launchable = repo.allApps(includeHidden = true, respectMode = false)
                .associateBy { it.packageName }
            val rows = usage
                .filterKeys { it in launchable || it == packageName }
                .toList()
                .sortedByDescending { it.second }
            val totalMinutes = rows.sumOf { it.second } / 60_000L
            addRow(container, getString(R.string.stats_total, formatMinutes(totalMinutes)), bold = true)
            rows.forEach { (pkg, millis) ->
                val minutes = millis / 60_000L
                if (minutes > 0) {
                    val label = launchable[pkg]?.displayLabel ?: repo.labelFor(pkg)
                    addRow(container, "$label — ${formatMinutes(minutes)}", bold = false)
                }
            }
        }

        val filtered = Prefs.get(this).filteredCountsToday()
        if (filtered.isNotEmpty()) {
            addRow(container, "", bold = false)
            val total = filtered.values.sum()
            addRow(container, getString(R.string.stats_filtered_total, total), bold = true)
            filtered.toList().sortedByDescending { it.second }.forEach { (pkg, count) ->
                addRow(container, "${repo.labelFor(pkg)} — $count", bold = false)
            }
        }
    }

    private fun formatMinutes(minutes: Long): String {
        val h = minutes / 60
        val m = minutes % 60
        return if (h > 0) getString(R.string.stats_hours_minutes, h, m)
        else getString(R.string.stats_minutes, m)
    }

    private fun addRow(
        container: LinearLayout,
        text: String,
        bold: Boolean,
        onClick: (() -> Unit)? = null,
    ) {
        val view = layoutInflater.inflate(R.layout.item_app_text, container, false) as TextView
        view.text = text
        if (bold) view.setTypeface(view.typeface, android.graphics.Typeface.BOLD)
        onClick?.let { handler -> view.setOnClickListener { handler() } }
        container.addView(
            view,
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
            )
        )
        if (text.isEmpty()) view.visibility = View.INVISIBLE
    }
}
