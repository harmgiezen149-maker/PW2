package io.github.minilauncher.data

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Fetches the current outdoor temperature from Open-Meteo (free, no API key).
 * Only the coarse coordinates are sent; the result is cached in memory.
 */
object WeatherFetcher {

    private const val CACHE_MILLIS = 30 * 60_000L

    @Volatile
    private var cachedTemp: Int? = null

    @Volatile
    private var cachedAt: Long = 0L

    /** Last fetched value, even when stale — better than a blank while updating. */
    fun lastKnown(): Int? = cachedTemp

    fun isFresh(): Boolean = System.currentTimeMillis() - cachedAt < CACHE_MILLIS

    /** Blocking network call — run on a background thread. */
    fun fetch(latitude: Double, longitude: Double): Int? = runCatching {
        val url = URL(
            "https://api.open-meteo.com/v1/forecast" +
                "?latitude=$latitude&longitude=$longitude&current=temperature_2m"
        )
        val connection = url.openConnection() as HttpURLConnection
        connection.connectTimeout = 5000
        connection.readTimeout = 5000
        val body = connection.inputStream.bufferedReader().use { it.readText() }
        Math.round(JSONObject(body).getJSONObject("current").getDouble("temperature_2m")).toInt()
    }.getOrNull()?.also {
        cachedTemp = it
        cachedAt = System.currentTimeMillis()
    }
}
