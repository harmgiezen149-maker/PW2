package io.github.minilauncher

import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.content.ContextCompat
import io.github.minilauncher.data.AppRepository
import io.github.minilauncher.data.Prefs
import io.github.minilauncher.util.EventLog

class App : Application() {

    /** The cached app list is only rebuilt when the installed packages change. */
    private val packageReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            AppRepository.invalidate()
        }
    }

    override fun onCreate() {
        super.onCreate()
        applyNightMode(Prefs.get(this).theme)
        EventLog.record(this, "PROCESS START")
        ContextCompat.registerReceiver(
            this,
            packageReceiver,
            IntentFilter().apply {
                addAction(Intent.ACTION_PACKAGE_ADDED)
                addAction(Intent.ACTION_PACKAGE_REMOVED)
                addAction(Intent.ACTION_PACKAGE_REPLACED)
                addAction(Intent.ACTION_PACKAGE_CHANGED)
                addDataScheme("package")
            },
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        EventLog.record(this, "trimMemory level=$level")
    }

    companion object {
        fun applyNightMode(theme: String) {
            AppCompatDelegate.setDefaultNightMode(
                when (theme) {
                    Prefs.THEME_LIGHT -> AppCompatDelegate.MODE_NIGHT_NO
                    else -> AppCompatDelegate.MODE_NIGHT_YES
                }
            )
        }
    }
}
