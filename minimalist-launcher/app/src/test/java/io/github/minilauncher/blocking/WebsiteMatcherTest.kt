package io.github.minilauncher.blocking

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WebsiteMatcherTest {

    private val sites = setOf("youtube.com", "reddit.com")

    @Test
    fun `exact host matches`() {
        assertEquals("youtube.com", WebsiteMatcher.matchesBlockedSite("youtube.com", sites))
    }

    @Test
    fun `subdomain matches`() {
        assertEquals("youtube.com", WebsiteMatcher.matchesBlockedSite("m.youtube.com", sites))
    }

    @Test
    fun `www prefix matches`() {
        assertEquals("youtube.com", WebsiteMatcher.matchesBlockedSite("www.youtube.com", sites))
    }

    @Test
    fun `full url with scheme path query and fragment matches`() {
        assertEquals(
            "youtube.com",
            WebsiteMatcher.matchesBlockedSite("https://www.youtube.com/watch?v=abc#t=1", sites),
        )
    }

    @Test
    fun `port is stripped`() {
        assertEquals("youtube.com", WebsiteMatcher.matchesBlockedSite("youtube.com:443", sites))
    }

    @Test
    fun `uppercase input matches`() {
        assertEquals("youtube.com", WebsiteMatcher.matchesBlockedSite("YouTube.COM", sites))
    }

    @Test
    fun `similar but different host does not match`() {
        assertNull(WebsiteMatcher.matchesBlockedSite("notyoutube.com", sites))
    }

    @Test
    fun `unrelated host does not match`() {
        assertNull(WebsiteMatcher.matchesBlockedSite("example.org", sites))
    }

    @Test
    fun `empty site set never matches`() {
        assertNull(WebsiteMatcher.matchesBlockedSite("youtube.com", emptySet()))
    }

    @Test
    fun `garbage input normalizes to null`() {
        assertNull(WebsiteMatcher.normalizeHost(""))
        assertNull(WebsiteMatcher.normalizeHost("   "))
        assertNull(WebsiteMatcher.normalizeHost("no-dot"))
        assertNull(WebsiteMatcher.normalizeHost("has space.com anyway"))
    }

    @Test
    fun `search text with spaces is rejected`() {
        assertNull(WebsiteMatcher.normalizeHost("how to bake bread"))
    }

    @Test
    fun `normalizeHost is idempotent`() {
        val once = WebsiteMatcher.normalizeHost("https://WWW.YouTube.com:443/watch?v=x")
        assertEquals("youtube.com", once)
        assertEquals(once, WebsiteMatcher.normalizeHost(once!!))
    }
}
