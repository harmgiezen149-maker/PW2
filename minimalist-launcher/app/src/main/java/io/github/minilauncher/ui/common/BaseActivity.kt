package io.github.minilauncher.ui.common

import android.content.Context
import android.content.res.Configuration
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import io.github.minilauncher.R
import io.github.minilauncher.data.Prefs

/** Applies the chosen theme (Light/Dark/OLED) and font scale to every screen. */
abstract class BaseActivity : AppCompatActivity() {

    override fun attachBaseContext(newBase: Context) {
        val prefs = Prefs.get(newBase)
        if (prefs.largeFont) {
            val config = Configuration(newBase.resources.configuration)
            config.fontScale = config.fontScale * 1.2f
            super.attachBaseContext(newBase.createConfigurationContext(config))
        } else {
            super.attachBaseContext(newBase)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        if (Prefs.get(this).theme == Prefs.THEME_OLED) {
            setTheme(R.style.Theme_MiniLauncher_Oled)
        }
        super.onCreate(savedInstanceState)
    }
}
