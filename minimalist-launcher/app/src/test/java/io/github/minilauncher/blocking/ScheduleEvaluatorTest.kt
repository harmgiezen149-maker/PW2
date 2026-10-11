package io.github.minilauncher.blocking

import io.github.minilauncher.data.model.Schedule
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ScheduleEvaluatorTest {

    private fun schedule(
        days: Set<Int>,
        start: Int,
        end: Int,
        enabled: Boolean = true,
    ) = Schedule("id", "test", days, start, end, enabled)

    private val monday = 1
    private val friday = 5
    private val saturday = 6
    private val sunday = 7

    @Test
    fun `simple daytime window is active inside and inactive outside`() {
        val s = schedule(setOf(monday), start = 9 * 60, end = 17 * 60)
        assertTrue(ScheduleEvaluator.isActive(s, monday, 9 * 60))
        assertTrue(ScheduleEvaluator.isActive(s, monday, 12 * 60))
        assertFalse(ScheduleEvaluator.isActive(s, monday, 17 * 60)) // end exclusive
        assertFalse(ScheduleEvaluator.isActive(s, monday, 8 * 60 + 59))
        assertFalse(ScheduleEvaluator.isActive(s, friday, 12 * 60)) // wrong day
    }

    @Test
    fun `disabled schedule never matches`() {
        val s = schedule(setOf(monday), 0, 24 * 60 - 1, enabled = false)
        assertFalse(ScheduleEvaluator.isActive(s, monday, 12 * 60))
    }

    @Test
    fun `empty day set never matches`() {
        val s = schedule(emptySet(), 0, 23 * 60)
        assertFalse(ScheduleEvaluator.isActive(s, monday, 12 * 60))
    }

    @Test
    fun `overnight window is active before midnight on the start day`() {
        val s = schedule(setOf(friday), start = 22 * 60, end = 6 * 60)
        assertTrue(ScheduleEvaluator.isActive(s, friday, 23 * 60))
        assertFalse(ScheduleEvaluator.isActive(s, friday, 21 * 60))
    }

    @Test
    fun `overnight window spills into the next morning`() {
        val s = schedule(setOf(friday), start = 22 * 60, end = 6 * 60)
        assertTrue(ScheduleEvaluator.isActive(s, saturday, 5 * 60))
        assertFalse(ScheduleEvaluator.isActive(s, saturday, 6 * 60)) // end exclusive
        assertFalse(ScheduleEvaluator.isActive(s, saturday, 23 * 60)) // Saturday not a start day
    }

    @Test
    fun `overnight window starting sunday wraps to monday`() {
        val s = schedule(setOf(sunday), start = 22 * 60, end = 6 * 60)
        assertTrue(ScheduleEvaluator.isActive(s, monday, 3 * 60))
        assertFalse(ScheduleEvaluator.isActive(s, monday, 7 * 60))
    }

    @Test
    fun `start equals end means the whole day`() {
        val s = schedule(setOf(monday), start = 8 * 60, end = 8 * 60)
        assertTrue(ScheduleEvaluator.isActive(s, monday, 0))
        assertTrue(ScheduleEvaluator.isActive(s, monday, 23 * 60 + 59))
        assertFalse(ScheduleEvaluator.isActive(s, friday, 12 * 60))
    }

    @Test
    fun `activeSchedule returns the matching schedule`() {
        val off = schedule(setOf(monday), 0, 60, enabled = false)
        val on = schedule(setOf(monday), 9 * 60, 17 * 60)
        val result = ScheduleEvaluator.activeSchedule(listOf(off, on), monday, 10 * 60)
        assertTrue(result === on)
    }
}
