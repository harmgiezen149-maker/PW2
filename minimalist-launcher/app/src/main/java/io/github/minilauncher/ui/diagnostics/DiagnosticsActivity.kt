package io.github.minilauncher.ui.diagnostics

import android.content.Intent
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import io.github.minilauncher.R
import io.github.minilauncher.data.Prefs
import io.github.minilauncher.ui.common.BaseActivity

/**
 * Shows the launcher's own lifecycle trail so a problem that only happens on
 * the device can be read back and shared. Deliberately plain text.
 */
class DiagnosticsActivity : BaseActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_diagnostics)

        findViewById<TextView>(R.id.diagnosticsClear).setOnClickListener {
            Prefs.get(this).diagnosticsLog = emptyList()
            render()
        }
        findViewById<TextView>(R.id.diagnosticsShare).setOnClickListener { share() }
    }

    override fun onResume() {
        super.onResume()
        render()
    }

    private fun render() {
        val container = findViewById<LinearLayout>(R.id.diagnosticsContainer)
        container.removeAllViews()
        val entries = Prefs.get(this).diagnosticsLog
        if (entries.isEmpty()) {
            addRow(container, getString(R.string.diagnostics_empty))
            return
        }
        // Newest last, so the end of the list is the moment of interest.
        entries.forEach { addRow(container, it) }
    }

    private fun addRow(container: LinearLayout, text: String) {
        val view = layoutInflater.inflate(R.layout.item_app_text, container, false) as TextView
        view.text = text
        view.textSize = 13f
        container.addView(view)
    }

    private fun share() {
        val entries = Prefs.get(this).diagnosticsLog
        if (entries.isEmpty()) return
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, getString(R.string.diagnostics_title))
            putExtra(Intent.EXTRA_TEXT, entries.joinToString("\n"))
        }
        runCatching {
            startActivity(Intent.createChooser(intent, getString(R.string.diagnostics_share)))
        }
    }
}
