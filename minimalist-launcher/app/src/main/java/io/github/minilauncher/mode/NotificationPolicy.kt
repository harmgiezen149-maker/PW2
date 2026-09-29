package io.github.minilauncher.mode

import io.github.minilauncher.data.model.AppVisibility

/**
 * Decides whether a notification may pass. A day/evening notification window
 * is the same question as app visibility ("in which mode is this allowed?"),
 * so it reuses [DayEveningEvaluator.isVisible] rather than duplicating the
 * window logic.
 */
object NotificationPolicy {

    /**
     * @param alwaysMuted the app is on the plain mute list — it never gets through.
     * @param window when notifications are allowed once day/evening mode is on.
     * @param state the resolved mode; when it is disabled, every window allows.
     */
    fun isAllowed(
        alwaysMuted: Boolean,
        window: AppVisibility,
        state: ModeState,
    ): Boolean = !alwaysMuted && DayEveningEvaluator.isVisible(window, state)
}
