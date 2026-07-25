package io.github.minilauncher.blocking

/**
 * Packages whose windows are system surfaces rather than an app the user
 * opened — the task switcher, the notification shade, the keyboard host, a
 * home app. Acting on those would fight the system UI (for instance kicking
 * the user out of the recent-apps overview). Pure, so it is unit-tested.
 */
object SystemSurfaces {

    private val KNOWN = setOf(
        "android",
        "com.android.systemui",
        "com.samsung.android.app.aodservice",
        "com.samsung.android.messaging.service",
        "com.sec.android.app.launcher",
        "com.google.android.apps.nexuslauncher",
        "com.android.launcher3",
    )

    fun isSystemSurface(
        pkg: String,
        homePackages: Set<String>,
        selfPackage: String,
    ): Boolean = pkg == selfPackage || pkg in KNOWN || pkg in homePackages
}
