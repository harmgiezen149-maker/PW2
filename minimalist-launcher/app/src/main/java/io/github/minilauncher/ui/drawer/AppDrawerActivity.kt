package io.github.minilauncher.ui.drawer

import android.os.Bundle
import android.widget.EditText
import androidx.core.widget.doAfterTextChanged
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import io.github.minilauncher.R
import io.github.minilauncher.data.AppRepository
import io.github.minilauncher.data.model.AppEntry
import io.github.minilauncher.ui.common.AppLauncher
import io.github.minilauncher.ui.common.AppLongPressDialog
import io.github.minilauncher.ui.common.BaseActivity
import io.github.minilauncher.ui.common.TextListAdapter

class AppDrawerActivity : BaseActivity() {

    private lateinit var repo: AppRepository
    private lateinit var adapter: TextListAdapter
    private var allApps: List<AppEntry> = emptyList()
    private var shown: List<AppEntry> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_drawer)
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
                    AppLongPressDialog.show(this, entry) { refresh() }
                }
            },
        )
        findViewById<RecyclerView>(R.id.appList).apply {
            layoutManager = LinearLayoutManager(this@AppDrawerActivity)
            adapter = this@AppDrawerActivity.adapter
        }
        findViewById<EditText>(R.id.searchField).doAfterTextChanged { filter(it?.toString().orEmpty()) }
    }

    override fun onResume() {
        super.onResume()
        refresh()
    }

    override fun finish() {
        super.finish()
        @Suppress("DEPRECATION")
        overridePendingTransition(R.anim.stay, R.anim.slide_out_down)
    }

    private fun refresh() {
        allApps = repo.allApps()
        filter(findViewById<EditText>(R.id.searchField).text?.toString().orEmpty())
    }

    private fun filter(query: String) {
        shown = if (query.isBlank()) allApps
        else allApps.filter { it.displayLabel.contains(query.trim(), ignoreCase = true) }
        adapter.submit(shown.map { it.displayLabel })
    }
}
