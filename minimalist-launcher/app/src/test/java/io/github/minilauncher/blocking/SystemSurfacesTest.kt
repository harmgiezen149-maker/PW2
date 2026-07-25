package io.github.minilauncher.blocking

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SystemSurfacesTest {

    private val self = "io.github.minilauncher"
    private val homes = setOf("io.github.minilauncher", "com.sec.android.app.launcher")

    @Test
    fun `our own launcher is a system surface`() {
        assertTrue(SystemSurfaces.isSystemSurface(self, homes, self))
    }

    @Test
    fun `system ui and the framework are system surfaces`() {
        assertTrue(SystemSurfaces.isSystemSurface("com.android.systemui", homes, self))
        assertTrue(SystemSurfaces.isSystemSurface("android", homes, self))
    }

    @Test
    fun `other home apps are system surfaces`() {
        assertTrue(SystemSurfaces.isSystemSurface("com.sec.android.app.launcher", homes, self))
    }

    @Test
    fun `a home app is recognised even when it is not in the queried set`() {
        assertTrue(SystemSurfaces.isSystemSurface("com.android.launcher3", emptySet(), self))
    }

    @Test
    fun `ordinary apps are not system surfaces`() {
        assertFalse(SystemSurfaces.isSystemSurface("com.google.android.youtube", homes, self))
        assertFalse(SystemSurfaces.isSystemSurface("com.whatsapp", homes, self))
        assertFalse(SystemSurfaces.isSystemSurface("com.android.chrome", homes, self))
    }

    @Test
    fun `an empty home set still filters the known packages`() {
        assertFalse(SystemSurfaces.isSystemSurface("com.netflix.mediaclient", emptySet(), self))
        assertTrue(SystemSurfaces.isSystemSurface("com.android.systemui", emptySet(), self))
    }
}
