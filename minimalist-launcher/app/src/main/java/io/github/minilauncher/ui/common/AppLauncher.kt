package io.github.minilauncher.ui.common

import android.content.Context
import io.github.minilauncher.blocking.BlockDecisionEngine
import io.github.minilauncher.data.AppRepository
import io.github.minilauncher.data.Prefs
import io.github.minilauncher.data.model.BlockedInfo
import io.github.minilauncher.data.model.Decision
import io.github.minilauncher.data.model.BlockReason
import io.github.minilauncher.ui.blocked.BlockedActivity
import io.github.minilauncher.ui.pause.PauseActivity
import io.github.minilauncher.usage.UsageRepository
import java.time.LocalDateTime

/**
 * Launches an app from the launcher UI, checking the block decision first so
 * the intervention screen appears immediately instead of after the
 * accessibility service catches up.
 */
object AppLauncher {

    /** Builds the engine Config from the current preferences. */
    fun configFrom(prefs: Prefs): BlockDecisionEngine.Config = BlockDecisionEngine.Config(
        blockedApps = prefs.blockedApps,
        focusModeEnabled = prefs.focusModeEnabled,
        schedules = prefs.schedules,
        limits = prefs.limits,
        tempAllowUntil = prefs.tempAllowUntil,
        mindfulApps = prefs.mindfulApps,
        focusSessionUntil = prefs.focusSessionUntil,
    )

    /** MINDFUL blocks get the pause screen; every other reason the block screen. */
    fun blockIntent(context: Context, info: BlockedInfo, label: String) =
        if (info.reason == BlockReason.MINDFUL) {
            PauseActivity.intent(context, info.packageName, label)
        } else {
            BlockedActivity.intent(context, info, label)
        }

    fun launch(context: Context, pkg: String) {
        val prefs = Prefs.get(context)
        val now = System.currentTimeMillis()
        val dateTime = LocalDateTime.now()
        val decision = BlockDecisionEngine.evaluate(
            packageName = pkg,
            config = configFrom(prefs),
            nowMillis = now,
            dayOfWeek = dateTime.dayOfWeek.value,
            minuteOfDay = dateTime.hour * 60 + dateTime.minute,
            usageTodayMillis = {
                if (PermissionChecks.hasUsageAccess(context)) {
                    UsageRepository.get(context).todayUsageMillis(it)
                } else 0L
            },
        )
        val repo = AppRepository(context)
        when (decision) {
            is Decision.Allow -> repo.launch(pkg)
            is Decision.Block -> context.startActivity(
                blockIntent(context, BlockedInfo(pkg, decision.reason, decision.detail), repo.labelFor(pkg))
            )
        }
    }
}
