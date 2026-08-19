package io.github.minilauncher.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class EventLogTest {

    @Test
    fun `append adds to the end`() {
        val result = EventLog.append(listOf("a", "b"), "c", max = 10)
        assertEquals(listOf("a", "b", "c"), result)
    }

    @Test
    fun `append drops the oldest beyond the cap`() {
        val result = EventLog.append(listOf("a", "b", "c"), "d", max = 3)
        assertEquals(listOf("b", "c", "d"), result)
    }

    @Test
    fun `append keeps exactly the cap`() {
        val result = EventLog.append(listOf("a", "b"), "c", max = 3)
        assertEquals(3, result.size)
        assertEquals("c", result.last())
    }

    @Test
    fun `append works from empty`() {
        assertEquals(listOf("first"), EventLog.append(emptyList(), "first", max = 5))
    }

    @Test
    fun `repeated appends never exceed the cap`() {
        var log = emptyList<String>()
        repeat(50) { log = EventLog.append(log, "entry $it", max = 10) }
        assertEquals(10, log.size)
        assertEquals("entry 49", log.last())
        assertEquals("entry 40", log.first())
    }

    @Test
    fun `format puts the time in front of the tag`() {
        val line = EventLog.format(0L, "HOME onResume")
        assertTrue("expected the tag to be kept: $line", line.endsWith("HOME onResume"))
        assertTrue("expected a HH:mm:ss.SSS stamp: $line", line.substring(0, 12).contains(':'))
    }
}
