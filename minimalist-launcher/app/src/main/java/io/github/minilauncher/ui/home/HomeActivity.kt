package io.github.minilauncher.ui.home

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import io.github.minilauncher.R
import io.github.minilauncher.blocking.BlockState
import io.github.minilauncher.data.AppRepository
import io.github.minilauncher.data.Prefs
import io.github.minilauncher.data.model.AppEntry
import io.github.minilauncher.ui.blocked.BlockedActivity
import io.github.minilauncher.ui.common.AppLauncher
import io.github.minilauncher.ui.common.AppLongPressDialog
import io.github.minilauncher.ui.common.BaseActivity
import io.github.minilauncher.ui.common.PermissionChecks
import io.github.minilauncher.ui.common.TextListAdapter
import io.github.minilauncher.ui.drawer.AppDrawerActivity
import io.github.minilauncher.ui.onboarding.OnboardingActivity
import io.github.minilauncher.ui.settings.SettingsActivity

class HomeActivity : BaseActivity() {

    private lateinit var repo: AppRepository
    private lateinit var prefs: Prefs
    private lateinit var adapter: TextListAdapter
    private var favorites: List<AppEntry> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)
        repo = AppRepository(this)
        prefs = Prefs.get(this)

        adapter = TextListAdapter(
            onClick = { pos -> favorites.getOrNull(pos)?.let { AppLauncher.launch(this, it.packageName) } },
            onLongClick = { pos ->
                favorites.getOrNull(pos)?.let { entry ->
                    AppLongPressDialog.show(this, entry) { refresh() }
                }
            },
        )
        findViewById<RecyclerView>(R.id.favoritesList).apply {
            layoutManager = LinearLayoutManager(this@HomeActivity)
            adapter = this@HomeActivity.adapter
        }

        findViewById<TextView>(R.id.allAppsButton).setOnClickListener {
            startActivity(Intent(this, AppDrawerActivity::class.java))
        }
        findViewById<TextView>(R.id.settingsButton).setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }
        findViewById<TextView>(R.id.blockerWarning).setOnClickListener {
            startActivity(Intent(this, OnboardingActivity::class.java))
        }

        if (!prefs.onboardingDone) {
            startActivity(Intent(this, OnboardingActivity::class.java))
        }
    }

    override fun onResume() {
        super.onResume()
        // Fallback path: the accessibility service forced us home because a
        // blocked app opened, but could not start the block screen itself.
        BlockState.consumePendingBlock()?.let { info ->
            startActivity(BlockedActivity.intent(this, info, repo.labelFor(info.packageName)))
        }
        refresh()
    }

    private fun refresh() {
        favorites = repo.favoriteApps()
        adapter.submit(favorites.map { it.displayLabel })
        findViewById<TextView>(R.id.emptyHint).visibility =
            if (favorites.isEmpty()) View.VISIBLE else View.GONE
        findViewById<TextView>(R.id.blockerWarning).visibility =
            if (PermissionChecks.blockerConfiguredButDisabled(this)) View.VISIBLE else View.GONE
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Home screen: back does nothing.
    }
}
