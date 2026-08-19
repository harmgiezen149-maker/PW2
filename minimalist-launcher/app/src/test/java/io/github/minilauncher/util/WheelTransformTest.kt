package io.github.minilauncher.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class WheelTransformTest {

    private val tolerance = 0.0001f

    @Test
    fun `dead centre keeps the normal size`() {
        assertEquals(1f, WheelTransform.scaleFor(0f), tolerance)
        assertEquals(1f, WheelTransform.alphaFor(0f), tolerance)
        assertEquals(0f, WheelTransform.rotationFor(0f), tolerance)
    }

    @Test
    fun `inside the dead zone nothing changes yet`() {
        val edgeOfZone = WheelTransform.DEAD_ZONE
        assertEquals(1f, WheelTransform.scaleFor(edgeOfZone), tolerance)
        assertEquals(1f, WheelTransform.alphaFor(edgeOfZone), tolerance)
        assertEquals(0f, WheelTransform.rotationFor(edgeOfZone), tolerance)
        assertEquals(0f, WheelTransform.rotationFor(-edgeOfZone), tolerance)
    }

    @Test
    fun `the edge reaches the configured minimums`() {
        assertEquals(WheelTransform.MIN_SCALE, WheelTransform.scaleFor(1f), tolerance)
        assertEquals(WheelTransform.MIN_ALPHA, WheelTransform.alphaFor(1f), tolerance)
        assertEquals(WheelTransform.MAX_ROTATION, WheelTransform.rotationFor(1f), tolerance)
    }

    @Test
    fun `both directions shrink the same amount`() {
        assertEquals(WheelTransform.scaleFor(0.6f), WheelTransform.scaleFor(-0.6f), tolerance)
        assertEquals(WheelTransform.alphaFor(0.6f), WheelTransform.alphaFor(-0.6f), tolerance)
    }

    @Test
    fun `rotation is mirrored above and below the centre`() {
        val below = WheelTransform.rotationFor(0.8f)
        val above = WheelTransform.rotationFor(-0.8f)
        assertEquals(below, -above, tolerance)
        assertTrue(below > 0f)
        assertTrue(above < 0f)
    }

    @Test
    fun `scale never grows as a row moves away from the centre`() {
        var previous = WheelTransform.scaleFor(0f)
        var ratio = 0.05f
        while (ratio <= 1f) {
            val current = WheelTransform.scaleFor(ratio)
            assertTrue("scale grew at ratio $ratio", current <= previous + tolerance)
            previous = current
            ratio += 0.05f
        }
    }

    @Test
    fun `over-scrolled ratios stay clamped to the minimums`() {
        assertEquals(WheelTransform.MIN_SCALE, WheelTransform.scaleFor(2.5f), tolerance)
        assertEquals(WheelTransform.MIN_ALPHA, WheelTransform.alphaFor(-4f), tolerance)
        assertEquals(-WheelTransform.MAX_ROTATION, WheelTransform.rotationFor(-3f), tolerance)
    }

    @Test
    fun `halfway out the row is visibly smaller but still readable`() {
        val scale = WheelTransform.scaleFor(0.5f)
        assertTrue("expected shrinking at half distance", scale < 1f)
        assertTrue("expected it to stay above the minimum", scale > WheelTransform.MIN_SCALE)
    }
}
