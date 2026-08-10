package io.github.minilauncher.util

import android.content.Context
import io.github.minilauncher.data.Prefs
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Records the launcher's own lifecycle so a problem that only shows up on the
 * device can be read back from Settings › Diagnostics. Nothing leaves the
 * phone unless the user shares it.
 */
object EventLog {

    const val MAX_ENTRIES = 120

    fun record(context: Context, tag: String) {
        val prefs = Prefs.get(context)
        prefs.diagnosticsLog = append(prefs.diagnosticsLog, format(System.currentTimeMillis(), tag))
    }

    fun format(timeMillis: Long, tag: String): String =
        "${TIME_FORMAT.format(Date(timeMillis))}  $tag"

    /** Appends [line], dropping the oldest entries beyond [max]. */
    fun append(existing: List<String>, line: String, max: Int = MAX_ENTRIES): List<String> {
        val combined = existing + line
        return if (combined.size <= max) combined else combined.takeLast(max)
    }

    private val TIME_FORMAT = SimpleDateFormat("HH:mm:ss.SSS", Locale.US)
}
