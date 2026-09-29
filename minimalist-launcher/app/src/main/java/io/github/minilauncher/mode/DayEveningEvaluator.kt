package io.github.minilauncher.mode

import io.github.minilauncher.data.model.AppVisibility

enum class LauncherMode { DAY, EVENING }

/** Resolved day/evening state: which mode is active and why. */
data class ModeState(
    val enabled: Boolean,
    val mode: LauncherMode,
    val overrideActive: Boolean,
    val overrideRemainingMinutes: Int,
) {
    val evening: Boolean get() = mode == LauncherMode.EVENING

    companion object {
        /** Feature switched off (or unreadable settings): every app stays visible. */
        val DISABLED = ModeState(false, LauncherMode.DAY, false, 0)
    }
}

/**
 * Pure day/evening logic, mirroring [io.github.minilauncher.blocking.ScheduleEvaluator]:
 * no Android dependencies, so it is unit-tested on a plain JVM.
 */
object DayEveningEvaluator {

    /**
     * Whether [minuteOfDay] falls inside the evening window. [startMinute] is
     * inclusive, [endMinute] exclusive. A window whose end is not after its
     * start wraps past midnight (20:00–07:00 covers 02:00); start == end means
     * the whole day counts as evening.
     */
    fun isEvening(startMinute: Int, endMinute: Int, minuteOfDay: Int): Boolean = when {
        startMinute == endMinute -> true
        startMinute < endMinute -> minuteOfDay >= startMinute && minuteOfDay < endMinute
        else -> minuteOfDay >= startMinute || minuteOfDay < endMinute
    }

    /**
     * Full resolution: the master switch wins, then a running override forces
     * evening, otherwise the time window decides.
     */
    fun resolve(
        enabled: Boolean,
        startMinute: Int,
        endMinute: Int,
        minuteOfDay: Int,
        overrideUntilMillis: Long,
        nowMillis: Long,
    ): ModeState {
        if (!enabled) return ModeState.DISABLED
        val overrideActive = overrideUntilMillis > nowMillis
        val evening = overrideActive || isEvening(startMinute, endMinute, minuteOfDay)
        return ModeState(
            enabled = true,
            mode = if (evening) LauncherMode.EVENING else LauncherMode.DAY,
            overrideActive = overrideActive,
            // Ceil, so an active override never reads as "0 min left"
            overrideRemainingMinutes = if (overrideActive) {
                ((overrideUntilMillis - nowMillis + 59_999) / 60_000L).toInt()
            } else 0,
        )
    }

    /** Whether an app with this [visibility] is shown in [state]. */
    fun isVisible(visibility: AppVisibility, state: ModeState): Boolean = when {
        !state.enabled -> true
        visibility == AppVisibility.ALWAYS -> true
        visibility == AppVisibility.DAY -> !state.evening
        else -> state.evening
    }
}
