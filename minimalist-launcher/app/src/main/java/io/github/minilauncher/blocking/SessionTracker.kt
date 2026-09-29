package io.github.minilauncher.blocking

/**
 * Tracks the continuous foreground session of the current app so the service
 * can post "you've been in X for N minutes" nudges. Purely in-memory.
 */
class SessionTracker(private val clock: () -> Long = { System.currentTimeMillis() }) {

    var currentPackage: String? = null
        private set

    private var sessionStart: Long = 0L
    private var nudgesFired: Int = 0

    /** Call on every foreground app change. Returns true if a new session started. */
    fun onForeground(pkg: String): Boolean {
        if (pkg == currentPackage) return false
        currentPackage = pkg
        sessionStart = clock()
        nudgesFired = 0
        return true
    }

    fun sessionMinutes(): Int {
        if (currentPackage == null) return 0
        return ((clock() - sessionStart) / 60_000L).toInt()
    }

    /**
     * Returns the nudge milestone (in minutes) that should fire now, or null.
     * Fires at every multiple of [intervalMinutes] once per milestone.
     */
    fun dueNudgeMinutes(intervalMinutes: Int): Int? {
        if (intervalMinutes <= 0 || currentPackage == null) return null
        val minutes = sessionMinutes()
        val milestone = (minutes / intervalMinutes)
        if (milestone > nudgesFired) {
            nudgesFired = milestone
            return milestone * intervalMinutes
        }
        return null
    }

    fun reset() {
        currentPackage = null
        sessionStart = 0L
        nudgesFired = 0
    }
}
