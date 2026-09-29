package io.github.minilauncher.ui.pause

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.animation.LinearInterpolator
import android.widget.LinearLayout
import android.widget.TextView
import io.github.minilauncher.R
import io.github.minilauncher.data.AppRepository
import io.github.minilauncher.data.Prefs
import io.github.minilauncher.ui.common.BaseActivity

/**
 * The mindful pause: a short breathing animation, then "how long do you want
 * to use this app?" — the chosen duration becomes a temporary allowance.
 */
class PauseActivity : BaseActivity() {

    private var animator: ValueAnimator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pause)

        val pkg = intent.getStringExtra(EXTRA_PACKAGE) ?: run { finish(); return }
        val label = intent.getStringExtra(EXTRA_LABEL) ?: pkg
        val prefs = Prefs.get(this)

        findViewById<TextView>(R.id.pauseAppName).text = label

        val durationsRow = findViewById<LinearLayout>(R.id.durationsRow)
        val durationsTitle = findViewById<TextView>(R.id.durationsTitle)
        for (minutes in intArrayOf(1, 2, 5, 10, 15)) {
            val button = layoutInflater.inflate(R.layout.item_app_text, durationsRow, false) as TextView
            button.text = getString(R.string.pause_minutes, minutes)
            button.setOnClickListener {
                prefs.allowTemporarily(pkg, System.currentTimeMillis() + minutes * 60_000L)
                AppRepository(this).launch(pkg)
                finish()
            }
            durationsRow.addView(button)
        }

        findViewById<TextView>(R.id.neverMindButton).setOnClickListener { finish() }

        val circle = findViewById<View>(R.id.breathingCircle)
        animator = ValueAnimator.ofFloat(0.6f, 1f).apply {
            duration = 3500
            interpolator = LinearInterpolator()
            repeatMode = ValueAnimator.REVERSE
            repeatCount = 3
            addUpdateListener { anim ->
                val scale = anim.animatedValue as Float
                circle.scaleX = scale
                circle.scaleY = scale
                circle.alpha = 0.4f + 0.6f * scale
            }
            addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    if (isFinishing || isDestroyed) return
                    durationsTitle.visibility = View.VISIBLE
                    durationsRow.visibility = View.VISIBLE
                    durationsRow.alpha = 0f
                    durationsRow.animate().alpha(1f).setDuration(400).start()
                }
            })
            start()
        }
    }

    override fun onDestroy() {
        animator?.cancel()
        animator = null
        super.onDestroy()
    }

    companion object {
        private const val EXTRA_PACKAGE = "package"
        private const val EXTRA_LABEL = "label"

        fun intent(context: Context, pkg: String, label: String): Intent =
            Intent(context, PauseActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                .putExtra(EXTRA_PACKAGE, pkg)
                .putExtra(EXTRA_LABEL, label)
    }
}
