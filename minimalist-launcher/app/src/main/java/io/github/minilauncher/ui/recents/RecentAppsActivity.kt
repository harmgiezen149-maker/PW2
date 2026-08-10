package io.github.minilauncher.ui.recents

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import io.github.minilauncher.R
import io.github.minilauncher.data.AppRepository
import io.github.minilauncher.data.model.AppEntry
import io.github.minilauncher.ui.common.AppLauncher
import io.github.minilauncher.ui.common.AppLongPressDialog
import io.github.minilauncher.ui.common.BaseActivity
import io.github.minilauncher.ui.common.PermissionChecks
import io.github.minilauncher.ui.common.TextListAdapter
import io.github.minilauncher.usage.UsageRepository
import java.util.concurrent.Executors

/**
 * The launcher's own task switcher: the apps you used most recently, newest
 * first. Samsung's overview is unreliable for a third-party home app — it
 * hands control back with a home intent that closes it again — so this list
 * does the one thing that matters, switching back to what you were doing.
 */
class RecentAppsActivity : BaseActivity() {

    private lateinit var repo: AppRepository
    private lateinit var adapter: TextListAdapter
    private val background = Executors.newSingleThreadExecutor()
    private var shown: List<AppEntry> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_recents)
        repo = AppRepository(this)

        adapter = TextListAdapter(
            onClick = { pos ->
                shown.getOrNull(pos)?.let {
                    AppLauncher.launch(this, it.packageName)
                    finish()
                }
            },
            onLongClick = { pos ->
                shown.getOrNull(pos)?.let { entry ->
                    AppLongPressDialog.show(this, entry) { load() }
                }
            },
        )
        findViewById<RecyclerView>(R.id.recentsList).apply {
            layoutManager = LinearLayoutManager(this@RecentAppsActivity)
            adapter = this@RecentAppsActivity.adapter
        }
        findViewById<TextView>(R.id.recentsHint).setOnClickListener {
            if (!PermissionChecks.hasUsageAccess(this)) {
                runCatching { startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)) }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        load()
    }

    override fun onDestroy() {
        background.shutdown()
        super.onDestroy()
    }

    override fun finish() {
        super.finish()
        @Suppress("DEPRECATION")
        overridePendingTransition(R.anim.stay, R.anim.slide_out_down)
    }

    private fun load() {
        if (!PermissionChecks.hasUsageAccess(this)) {
            showHint(getString(R.string.recents_no_permission))
            return
        }
        background.execute {
            val recents = UsageRepository.get(this).recentlyUsedPackages()
            // Respect hidden apps and the day/evening mode, like every other list.
            val byPackage = runCatching { repo.allApps() }.getOrDefault(emptyList())
                .associateBy { it.packageName }
            val entries = recents.mapNotNull { byPackage[it] }
            runOnUiThread {
                if (isFinishing || isDestroyed) return@runOnUiThread
                shown = entries
                adapter.submit(entries.map { it.displayLabel })
                if (entries.isEmpty()) showHint(getString(R.string.recents_empty))
                else findViewById<TextView>(R.id.recentsHint).visibility = View.GONE
            }
        }
    }

    private fun showHint(text: String) {
        findViewById<TextView>(R.id.recentsHint).apply {
            this.text = text
            visibility = View.VISIBLE
        }
    }
}
