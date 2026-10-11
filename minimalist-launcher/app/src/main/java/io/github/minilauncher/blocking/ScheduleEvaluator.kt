package io.github.minilauncher.blocking

import io.github.minilauncher.data.model.Schedule

/**
 * Pure schedule-window logic. Day-of-week is ISO (1 = Monday .. 7 = Sunday);
 * a schedule's day set refers to the day the window starts on, so an
 * overnight window (end <= start) that starts Friday is still active early
 * Saturday morning.
 */
object ScheduleEvaluator {

    fun isActive(schedule: Schedule, dayOfWeek: Int, minuteOfDay: Int): Boolean {
        if (!schedule.enabled || schedule.days.isEmpty()) return false
        val start = schedule.startMinute
        val end = schedule.endMinute
        return when {
            // start == end: full-day block on the selected days
            start == end -> dayOfWeek in schedule.days
            start < end -> dayOfWeek in schedule.days && minuteOfDay >= start && minuteOfDay < end
            else -> {
                // Overnight wrap: active from start on a selected day until end the next day
                val previousDay = if (dayOfWeek == 1) 7 else dayOfWeek - 1
                (dayOfWeek in schedule.days && minuteOfDay >= start) ||
                    (previousDay in schedule.days && minuteOfDay < end)
            }
        }
    }

    /** The first schedule active at the given moment, or null. */
    fun activeSchedule(schedules: List<Schedule>, dayOfWeek: Int, minuteOfDay: Int): Schedule? =
        schedules.firstOrNull { isActive(it, dayOfWeek, minuteOfDay) }
}
