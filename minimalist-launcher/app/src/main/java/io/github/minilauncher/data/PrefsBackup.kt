package io.github.minilauncher.data

import org.json.JSONArray
import org.json.JSONObject

/**
 * Converts the launcher's SharedPreferences to one JSON document and back, so
 * settings survive a reinstall (for example after a signing-key change). Each
 * value keeps its type, because SharedPreferences has a typed getter per key.
 * Pure JSON, so it is unit-tested on a plain JVM.
 */
object PrefsBackup {

    private const val FORMAT = "minimalist-launcher-settings"
    private const val FORMAT_VERSION = 1

    /** Device-specific state that must not travel to a fresh install. */
    val EXCLUDED_KEYS = setOf("onboarding_done")

    fun encode(values: Map<String, *>): String {
        val entries = JSONObject()
        for ((key, value) in values.toSortedMap()) {
            if (key in EXCLUDED_KEYS) continue
            val (type, json) = when (value) {
                is String -> TYPE_STRING to value
                is Boolean -> TYPE_BOOLEAN to value
                is Int -> TYPE_INT to value
                is Long -> TYPE_LONG to value
                is Float -> TYPE_FLOAT to value.toDouble()
                is Set<*> -> TYPE_STRING_SET to JSONArray(value.filterIsInstance<String>().sorted())
                else -> continue
            }
            entries.put(key, JSONObject().put("type", type).put("value", json))
        }
        return JSONObject()
            .put("format", FORMAT)
            .put("version", FORMAT_VERSION)
            .put("entries", entries)
            .toString(2)
    }

    /**
     * @throws IllegalArgumentException when [text] is not a launcher backup
     * @throws org.json.JSONException when a backup entry is malformed
     */
    fun decode(text: String): Map<String, Any> {
        val root = runCatching { JSONObject(text) }.getOrNull()
        require(root != null && root.optString("format") == FORMAT) { "Not a launcher settings file" }
        val entries = root.getJSONObject("entries")
        return buildMap {
            for (key in entries.keys()) {
                if (key in EXCLUDED_KEYS) continue
                val entry = entries.getJSONObject(key)
                val value: Any = when (entry.getString("type")) {
                    TYPE_STRING -> entry.getString("value")
                    TYPE_BOOLEAN -> entry.getBoolean("value")
                    TYPE_INT -> entry.getInt("value")
                    TYPE_LONG -> entry.getLong("value")
                    TYPE_FLOAT -> entry.getDouble("value").toFloat()
                    TYPE_STRING_SET -> entry.getJSONArray("value").let { arr ->
                        buildSet { for (i in 0 until arr.length()) add(arr.getString(i)) }
                    }
                    else -> continue // written by a newer version; skip what we cannot read
                }
                put(key, value)
            }
        }
    }

    private const val TYPE_STRING = "string"
    private const val TYPE_BOOLEAN = "boolean"
    private const val TYPE_INT = "int"
    private const val TYPE_LONG = "long"
    private const val TYPE_FLOAT = "float"
    private const val TYPE_STRING_SET = "string_set"
}
