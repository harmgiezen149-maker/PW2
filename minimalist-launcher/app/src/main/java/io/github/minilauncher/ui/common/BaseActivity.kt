package io.github.minilauncher.ui.common

import android.content.Context
import android.content.res.Configuration
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import io.github.minilauncher.R
import io.github.minilauncher.data.Prefs

/** Applies the chosen font scale and CRT text color to every screen. */
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
        if (Prefs.get(this).crtGreen) {
            theme.applyStyle(R.style.ThemeOverlay_MiniLauncher_Crt, true)
        }
        super.onCreate(savedInstanceState)
    }
}
