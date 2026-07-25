package io.github.minilauncher.mode

import io.github.minilauncher.data.model.AppVisibility
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationPolicyTest {

    private val now = 1_000_000L
    private val eveningStart = 20 * 60
    private val eveningEnd = 7 * 60

    private fun state(hour: Int, overrideUntil: Long = 0L): ModeState =
        DayEveningEvaluator.resolve(
            enabled = true,
            startMinute = eveningStart,
            endMinute = eveningEnd,
            minuteOfDay = hour * 60,
            overrideUntilMillis = overrideUntil,
            nowMillis = now,
        )

    @Test
    fun `muted apps never get through, in any mode`() {
        AppVisibility.entries.forEach { window ->
            assertFalse(NotificationPolicy.isAllowed(true, window, state(hour = 10)))
            assertFalse(NotificationPolicy.isAllowed(true, window, state(hour = 22)))
            assertFalse(NotificationPolicy.isAllowed(true, window, ModeState.DISABLED))
        }
    }

    @Test
    fun `unconfigured apps are allowed`() {
        assertTrue(NotificationPolicy.isAllowed(false, AppVisibility.ALWAYS, state(hour = 10)))
        assertTrue(NotificationPolicy.isAllowed(false, AppVisibility.ALWAYS, state(hour = 22)))
    }

    @Test
    fun `evening-only notifications are blocked during the day`() {
        assertFalse(NotificationPolicy.isAllowed(false, AppVisibility.EVENING, state(hour = 10)))
    }

    @Test
    fun `evening-only notifications pass in the evening`() {
        assertTrue(NotificationPolicy.isAllowed(false, AppVisibility.EVENING, state(hour = 22)))
        assertTrue(NotificationPolicy.isAllowed(false, AppVisibility.EVENING, state(hour = 2)))
    }

    @Test
    fun `day-only notifications are blocked in the evening`() {
        assertTrue(NotificationPolicy.isAllowed(false, AppVisibility.DAY, state(hour = 10)))
        assertFalse(NotificationPolicy.isAllowed(false, AppVisibility.DAY, state(hour = 22)))
    }

    @Test
    fun `a temporary override also opens up evening-only notifications`() {
        val overridden = state(hour = 10, overrideUntil = now + 10 * 60_000L)
        assertTrue(NotificationPolicy.isAllowed(false, AppVisibility.EVENING, overridden))
        assertFalse(NotificationPolicy.isAllowed(false, AppVisibility.DAY, overridden))
    }

    @Test
    fun `with day-evening mode off every window allows`() {
        AppVisibility.entries.forEach {
            assertTrue(NotificationPolicy.isAllowed(false, it, ModeState.DISABLED))
        }
    }
}
