package io.github.minilauncher.util

import kotlin.math.abs

/**
 * The scale/fade/tilt curve for the app drawer's drum effect: rows near the
 * middle of the screen keep their normal size, rows towards the edges shrink,
 * dim and tilt away. Pure math, so it is unit-tested on a plain JVM.
 *
 * All inputs are a row's distance from the viewport centre, normalised over
 * half the viewport height: 0 = dead centre, 1 = the top or bottom edge.
 */
object WheelTransform {

    /** Rows this close to the centre stay untouched, so the focus band reads as normal size. */
    const val DEAD_ZONE = 0.15f
    const val MIN_SCALE = 0.72f
    const val MIN_ALPHA = 0.45f
    const val MAX_ROTATION = 28f

    fun scaleFor(distanceRatio: Float): Float = 1f - falloff(distanceRatio) * (1f - MIN_SCALE)

    fun alphaFor(distanceRatio: Float): Float = 1f - falloff(distanceRatio) * (1f - MIN_ALPHA)

    /**
     * Tilt in degrees for a signed ratio: negative above the centre, positive
     * below it, so the list bends away from the viewer at both ends.
     */
    fun rotationFor(signedRatio: Float): Float {
        val amount = falloff(abs(signedRatio)) * MAX_ROTATION
        return if (signedRatio < 0f) -amount else amount
    }

    /**
     * 0 inside the dead zone, easing up to 1 at the edge. Squared so the
     * change stays gentle near the middle and picks up towards the edges —
     * that is what makes it read as a curved drum instead of a linear ramp.
     */
    private fun falloff(distanceRatio: Float): Float {
        val clamped = abs(distanceRatio).coerceIn(0f, 1f)
        if (clamped <= DEAD_ZONE) return 0f
        val t = (clamped - DEAD_ZONE) / (1f - DEAD_ZONE)
        return t * t
    }
}
