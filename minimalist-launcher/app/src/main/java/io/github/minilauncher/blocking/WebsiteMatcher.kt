package io.github.minilauncher.blocking

/**
 * Pure host matching for the website blocker. Deliberately avoids
 * android.net.Uri so it can be unit-tested on a plain JVM.
 */
object WebsiteMatcher {

    /** "https://WWW.YouTube.com:443/watch?v=x" -> "youtube.com"; null if unusable. */
    fun normalizeHost(input: String): String? {
        var s = input.trim().lowercase()
        if ("://" in s) s = s.substringAfter("://")
        s = s.takeWhile { it != '/' && it != '?' && it != '#' }
        s = s.substringBefore(':')
        s = s.removePrefix("www.").trim('.')
        return s.takeIf { it.isNotEmpty() && '.' in it && ' ' !in it }
    }

    /**
     * Returns the blocked site that matches [urlOrHost] (exact host or any
     * subdomain), or null. [sites] must contain pre-normalized hosts.
     */
    fun matchesBlockedSite(urlOrHost: String, sites: Set<String>): String? {
        if (sites.isEmpty()) return null
        val host = normalizeHost(urlOrHost) ?: return null
        return sites.firstOrNull { host == it || host.endsWith(".$it") }
    }
}
