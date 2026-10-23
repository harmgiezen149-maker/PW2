package io.github.minilauncher.data

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PrefsBackupTest {

    private val sample: Map<String, Any> = mapOf(
        "favorites" to "[\"com.a\",\"com.b\"]",
        "focus_mode" to true,
        "nudge_interval_min" to 15,
        "focus_session_until" to 1_700_000_000_000L,
        "some_float" to 1.5f,
        "blocked_apps" to setOf("com.x", "com.y"),
    )

    @Test
    fun `round trips every value type`() {
        val restored = PrefsBackup.decode(PrefsBackup.encode(sample))
        assertEquals(sample, restored)
    }

    @Test
    fun `keeps the exact type of numbers`() {
        val restored = PrefsBackup.decode(PrefsBackup.encode(sample))
        assertTrue(restored["nudge_interval_min"] is Int)
        assertTrue(restored["focus_session_until"] is Long)
        assertTrue(restored["some_float"] is Float)
    }

    @Test
    fun `leaves onboarding progress out`() {
        val json = PrefsBackup.encode(sample + ("onboarding_done" to true))
        assertFalse(JSONObject(json).getJSONObject("entries").has("onboarding_done"))
    }

    @Test
    fun `ignores onboarding progress in a hand-edited file`() {
        val json = JSONObject(PrefsBackup.encode(sample))
        json.getJSONObject("entries")
            .put("onboarding_done", JSONObject().put("type", "boolean").put("value", true))
        assertFalse(PrefsBackup.decode(json.toString()).containsKey("onboarding_done"))
    }

    @Test
    fun `empty settings round trip`() {
        assertEquals(emptyMap<String, Any>(), PrefsBackup.decode(PrefsBackup.encode(emptyMap<String, Any>())))
    }

    @Test
    fun `skips entry types it does not know`() {
        val json = JSONObject(PrefsBackup.encode(sample))
        json.getJSONObject("entries")
            .put("future", JSONObject().put("type", "something_new").put("value", 1))
        assertEquals(sample, PrefsBackup.decode(json.toString()))
    }

    @Test(expected = IllegalArgumentException::class)
    fun `rejects a json file that is not a launcher backup`() {
        PrefsBackup.decode("{\"hello\": \"world\"}")
    }

    @Test(expected = IllegalArgumentException::class)
    fun `rejects text that is not json`() {
        PrefsBackup.decode("not json at all")
    }
}
