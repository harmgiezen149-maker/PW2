package io.github.minilauncher.mode

import io.github.minilauncher.data.model.AppVisibility
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DayEveningEvaluatorTest {

    private fun at(hour: Int, minute: Int = 0) = hour * 60 + minute

    // Defaults: evening 20:00 -> 07:00, so the window wraps past midnight.
    private val start = at(20)
    private val end = at(7)

    private val now = 1_000_000L

    // ---- window: across midnight ----

    @Test
    fun `just before the start it is still day`() {
        assertFalse(DayEveningEvaluator.isEvening(start, end, at(19, 59)))
    }

    @Test
    fun `the start minute itself is evening`() {
        assertTrue(DayEveningEvaluator.isEvening(start, end, at(20)))
    }

    @Test
    fun `late evening before midnight is evening`() {
        assertTrue(DayEveningEvaluator.isEvening(start, end, at(23, 59)))
    }

    @Test
    fun `midnight and the small hours are evening`() {
        assertTrue(DayEveningEvaluator.isEvening(start, end, at(0)))
        assertTrue(DayEveningEvaluator.isEvening(start, end, at(2)))
        assertTrue(DayEveningEvaluator.isEvening(start, end, at(6, 59)))
    }

    @Test
    fun `the end minute itself is day again`() {
        assertFalse(DayEveningEvaluator.isEvening(start, end, at(7)))
    }

    @Test
    fun `morning is day`() {
        assertFalse(DayEveningEvaluator.isEvening(start, end, at(8)))
        assertFalse(DayEveningEvaluator.isEvening(start, end, at(12)))
    }

    // ---- window: inside a single day ----

    @Test
    fun `window within one day matches only inside it`() {
        val s = at(8)
        val e = at(12)
        assertFalse(DayEveningEvaluator.isEvening(s, e, at(7, 59)))
        assertTrue(DayEveningEvaluator.isEvening(s, e, at(8)))
        assertTrue(DayEveningEvaluator.isEvening(s, e, at(11, 59)))
        assertFalse(DayEveningEvaluator.isEvening(s, e, at(12)))
        assertFalse(DayEveningEvaluator.isEvening(s, e, at(23)))
        assertFalse(DayEveningEvaluator.isEvening(s, e, at(0)))
    }

    // ---- window: start equals end ----

    @Test
    fun `start equal to end covers the whole day`() {
        val s = at(20)
        assertTrue(DayEveningEvaluator.isEvening(s, s, at(0)))
        assertTrue(DayEveningEvaluator.isEvening(s, s, at(12)))
        assertTrue(DayEveningEvaluator.isEvening(s, s, at(20)))
        assertTrue(DayEveningEvaluator.isEvening(s, s, at(23, 59)))
    }

    @Test
    fun `midnight to midnight also covers the whole day`() {
        assertTrue(DayEveningEvaluator.isEvening(0, 0, at(9)))
    }

    // ---- resolve ----

    @Test
    fun `master switch off yields the disabled state`() {
        val state = DayEveningEvaluator.resolve(
            enabled = false,
            startMinute = start,
            endMinute = end,
            minuteOfDay = at(22),
            overrideUntilMillis = 0L,
            nowMillis = now,
        )
        assertEquals(ModeState.DISABLED, state)
        assertFalse(state.enabled)
    }

    @Test
    fun `evening window resolves to evening mode`() {
        val state = resolve(minuteOfDay = at(2))
        assertTrue(state.enabled)
        assertTrue(state.evening)
        assertEquals(LauncherMode.EVENING, state.mode)
        assertFalse(state.overrideActive)
    }

    @Test
    fun `day window resolves to day mode`() {
        val state = resolve(minuteOfDay = at(8))
        assertEquals(LauncherMode.DAY, state.mode)
        assertFalse(state.evening)
    }

    @Test
    fun `active override forces evening during the day`() {
        val state = resolve(minuteOfDay = at(12), overrideUntil = now + 10 * 60_000L)
        assertTrue(state.evening)
        assertTrue(state.overrideActive)
    }

    @Test
    fun `override remaining minutes are rounded up`() {
        // 30s left must read as 1 min, never 0
        assertEquals(1, resolve(overrideUntil = now + 30_000L).overrideRemainingMinutes)
        assertEquals(15, resolve(overrideUntil = now + 15 * 60_000L).overrideRemainingMinutes)
    }

    @Test
    fun `expired override falls back to the time window`() {
        val state = resolve(minuteOfDay = at(12), overrideUntil = now - 1L)
        assertFalse(state.overrideActive)
        assertFalse(state.evening)
        assertEquals(0, state.overrideRemainingMinutes)
    }

    // ---- visibility ----

    @Test
    fun `always apps are visible in both modes`() {
        assertTrue(DayEveningEvaluator.isVisible(AppVisibility.ALWAYS, resolve(minuteOfDay = at(8))))
        assertTrue(DayEveningEvaluator.isVisible(AppVisibility.ALWAYS, resolve(minuteOfDay = at(22))))
    }

    @Test
    fun `day apps are hidden in the evening`() {
        assertTrue(DayEveningEvaluator.isVisible(AppVisibility.DAY, resolve(minuteOfDay = at(8))))
        assertFalse(DayEveningEvaluator.isVisible(AppVisibility.DAY, resolve(minuteOfDay = at(22))))
    }

    @Test
    fun `evening apps are hidden during the day`() {
        assertFalse(DayEveningEvaluator.isVisible(AppVisibility.EVENING, resolve(minuteOfDay = at(8))))
        assertTrue(DayEveningEvaluator.isVisible(AppVisibility.EVENING, resolve(minuteOfDay = at(22))))
    }

    @Test
    fun `with the feature off every app stays visible`() {
        AppVisibility.entries.forEach {
            assertTrue(DayEveningEvaluator.isVisible(it, ModeState.DISABLED))
        }
    }

    private fun resolve(
        minuteOfDay: Int = at(22),
        overrideUntil: Long = 0L,
    ): ModeState = DayEveningEvaluator.resolve(
        enabled = true,
        startMinute = start,
        endMinute = end,
        minuteOfDay = minuteOfDay,
        overrideUntilMillis = overrideUntil,
        nowMillis = now,
    )
}
