package io.github.minilauncher.blocking

import io.github.minilauncher.data.model.BlockReason
import io.github.minilauncher.data.model.Decision
import io.github.minilauncher.data.model.Schedule

/**
 * Pure decision logic: given the current configuration and time, should a
 * package be blocked? Precedence: temporary allowance > focus mode /
 * schedule > daily limit.
 */
object BlockDecisionEngine {

    data class Config(
        val blockedApps: Set<String>,
        val focusModeEnabled: Boolean,
        val schedules: List<Schedule>,
        /** package -> daily limit in minutes */
        val limits: Map<String, Int>,
        /** package -> epoch millis until which the app is temporarily allowed */
        val tempAllowUntil: Map<String, Long>,
    )

    /**
     * @param usageTodayMillis lazily computed foreground time since local
     *   midnight; only invoked when the package has a limit configured.
     * @param dayOfWeek ISO day (1 = Monday .. 7 = Sunday)
     */
    fun evaluate(
        packageName: String,
        config: Config,
        nowMillis: Long,
        dayOfWeek: Int,
        minuteOfDay: Int,
        usageTodayMillis: (String) -> Long,
    ): Decision {
        val allowedUntil = config.tempAllowUntil[packageName] ?: 0L
        if (allowedUntil > nowMillis) return Decision.Allow

        if (packageName in config.blockedApps) {
            if (config.focusModeEnabled) {
                return Decision.Block(BlockReason.FOCUS_MODE, "")
            }
            val active = ScheduleEvaluator.activeSchedule(config.schedules, dayOfWeek, minuteOfDay)
            if (active != null) {
                return Decision.Block(BlockReason.SCHEDULE, formatWindowEnd(active))
            }
        }

        val limitMinutes = config.limits[packageName]
        if (limitMinutes != null && limitMinutes > 0) {
            val usedMillis = usageTodayMillis(packageName)
            if (usedMillis >= limitMinutes * 60_000L) {
                return Decision.Block(BlockReason.LIMIT, limitMinutes.toString())
            }
        }
        return Decision.Allow
    }

    private fun formatWindowEnd(schedule: Schedule): String {
        val h = schedule.endMinute / 60
        val m = schedule.endMinute % 60
        return "%02d:%02d".format(h, m)
    }
}
