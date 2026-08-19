package io.github.minilauncher.ui.common

import android.content.Context
import android.view.View
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import io.github.minilauncher.data.Prefs
import io.github.minilauncher.util.WheelTransform

/**
 * Vertical list that reads like a large rotating drum: rows in the middle of
 * the screen keep their normal size, rows towards the top and bottom shrink,
 * dim and tilt away.
 *
 * The transform is re-applied after every layout pass and every scrolled pixel,
 * which also covers flings and programmatic scrolls.
 */
class WheelLayoutManager(context: Context) : LinearLayoutManager(context) {

    private val alignment = Prefs.get(context).alignment

    override fun onLayoutChildren(recycler: RecyclerView.Recycler?, state: RecyclerView.State?) {
        super.onLayoutChildren(recycler, state)
        transformChildren()
    }

    override fun scrollVerticallyBy(
        dy: Int,
        recycler: RecyclerView.Recycler?,
        state: RecyclerView.State?,
    ): Int {
        val scrolled = super.scrollVerticallyBy(dy, recycler, state)
        transformChildren()
        return scrolled
    }

    private fun transformChildren() {
        val viewportHeight = height
        if (viewportHeight == 0 || childCount == 0) return

        // Nothing to roll: a list that fits on screen stays flat, so a single
        // search result never renders as shrunken text.
        if (contentFits(viewportHeight)) {
            for (i in 0 until childCount) getChildAt(i)?.let(::reset)
            return
        }

        val centre = viewportHeight / 2f
        for (i in 0 until childCount) {
            val child = getChildAt(i) ?: continue
            val childCentre = (child.top + child.bottom) / 2f
            val signedRatio = ((childCentre - centre) / centre).coerceIn(-1f, 1f)

            child.pivotX = when (alignment) {
                Prefs.ALIGN_CENTER -> child.width / 2f
                Prefs.ALIGN_RIGHT -> child.width.toFloat()
                else -> 0f
            }
            child.pivotY = child.height / 2f
            // Keeps the perspective shallow so tilted text stays crisp.
            child.cameraDistance = 8f * viewportHeight

            val scale = WheelTransform.scaleFor(signedRatio)
            child.scaleX = scale
            child.scaleY = scale
            child.alpha = WheelTransform.alphaFor(signedRatio)
            child.rotationX = WheelTransform.rotationFor(signedRatio)
        }
    }

    private fun reset(child: View) {
        child.scaleX = 1f
        child.scaleY = 1f
        child.alpha = 1f
        child.rotationX = 0f
    }

    /** True when every row is attached and none of them runs past the viewport. */
    private fun contentFits(viewportHeight: Int): Boolean {
        if (childCount < itemCount) return false
        val first = getChildAt(0) ?: return true
        val last = getChildAt(childCount - 1) ?: return true
        return first.top >= 0 && last.bottom <= viewportHeight
    }
}
