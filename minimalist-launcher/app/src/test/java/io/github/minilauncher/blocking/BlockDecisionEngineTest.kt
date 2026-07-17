package io.github.minilauncher.blocking

import io.github.minilauncher.data.model.BlockReason
import io.github.minilauncher.data.model.Decision
import io.github.minilauncher.data.model.Schedule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BlockDecisionEngineTest {

    private val pkg = "com.example.distraction"
    private val monday = 1
    private val noon = 12 * 60
    private val now = 1_000_000L

    private val workHours = Schedule("s1", "work", setOf(monday), 9 * 60, 17 * 60, enabled = true)

    private fun config(
        blocked: Set<String> = emptySet(),
        focus: Boolean = false,
        schedules: List<Schedule> = emptyList(),
        limits: Map<String, Int> = emptyMap(),
        tempAllow: Map<String, Long> = emptyMap(),
    ) = BlockDecisionEngine.Config(blocked, focus, schedules, limits, tempAllow)

    private fun evaluate(
        config: BlockDecisionEngine.Config,
        usageMillis: Long = 0L,
        minuteOfDay: Int = noon,
    ): Decision = BlockDecisionEngine.evaluate(
        packageName = pkg,
        config = config,
        nowMillis = now,
        dayOfWeek = monday,
        minuteOfDay = minuteOfDay,
        usageTodayMillis = { usageMillis },
    )

    @Test
    fun `unlisted app is allowed`() {
        assertEquals(Decision.Allow, evaluate(config()))
    }

    @Test
    fun `focus mode blocks a listed app regardless of schedule`() {
        val decision = evaluate(config(blocked = setOf(pkg), focus = true))
        assertTrue(decision is Decision.Block && decision.reason == BlockReason.FOCUS_MODE)
    }

    @Test
    fun `focus mode does not block apps that are not on the list`() {
        val decision = evaluate(config(blocked = setOf("other.app"), focus = true))
        assertEquals(Decision.Allow, decision)
    }

    @Test
    fun `schedule blocks a listed app inside the window`() {
        val decision = evaluate(config(blocked = setOf(pkg), schedules = listOf(workHours)))
        assertTrue(decision is Decision.Block && decision.reason == BlockReason.SCHEDULE)
        assertEquals("17:00", (decision as Decision.Block).detail)
    }

    @Test
    fun `schedule does not block outside the window`() {
        val decision = evaluate(
            config(blocked = setOf(pkg), schedules = listOf(workHours)),
            minuteOfDay = 18 * 60,
        )
        assertEquals(Decision.Allow, decision)
    }

    @Test
    fun `temporary allowance beats focus mode and schedule`() {
        val decision = evaluate(
            config(
                blocked = setOf(pkg),
                focus = true,
                schedules = listOf(workHours),
                tempAllow = mapOf(pkg to now + 60_000L),
            )
        )
        assertEquals(Decision.Allow, decision)
    }

    @Test
    fun `expired allowance no longer applies`() {
        val decision = evaluate(
            config(blocked = setOf(pkg), focus = true, tempAllow = mapOf(pkg to now - 1L))
        )
        assertTrue(decision is Decision.Block)
    }

    @Test
    fun `limit blocks once usage reaches the cap`() {
        val decision = evaluate(
            config(limits = mapOf(pkg to 30)),
            usageMillis = 30 * 60_000L,
        )
        assertTrue(decision is Decision.Block && decision.reason == BlockReason.LIMIT)
    }

    @Test
    fun `limit allows while under the cap`() {
        val decision = evaluate(
            config(limits = mapOf(pkg to 30)),
            usageMillis = 29 * 60_000L,
        )
        assertEquals(Decision.Allow, decision)
    }

    @Test
    fun `usage is not consulted when no limit is configured`() {
        var consulted = false
        val decision = BlockDecisionEngine.evaluate(
            packageName = pkg,
            config = config(),
            nowMillis = now,
            dayOfWeek = monday,
            minuteOfDay = noon,
            usageTodayMillis = { consulted = true; 0L },
        )
        assertEquals(Decision.Allow, decision)
        assertTrue(!consulted)
    }

    @Test
    fun `schedule block takes precedence over limit`() {
        val decision = evaluate(
            config(
                blocked = setOf(pkg),
                schedules = listOf(workHours),
                limits = mapOf(pkg to 30),
            ),
            usageMillis = 60 * 60_000L,
        )
        assertTrue(decision is Decision.Block && decision.reason == BlockReason.SCHEDULE)
    }
}
