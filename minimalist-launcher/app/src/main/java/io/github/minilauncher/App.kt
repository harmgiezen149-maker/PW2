package io.github.minilauncher

import android.app.Application
import androidx.appcompat.app.AppCompatDelegate
import io.github.minilauncher.data.Prefs

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        applyNightMode(Prefs.get(this).theme)
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
