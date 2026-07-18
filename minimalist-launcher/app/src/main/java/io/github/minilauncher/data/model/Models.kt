package io.github.minilauncher.data.model

import org.json.JSONArray
import org.json.JSONObject

/** A launchable app as shown in the launcher, after rename/hide are applied. */
data class AppEntry(
    val packageName: String,
    val originalLabel: String,
    val displayLabel: String,
    val isHidden: Boolean,
    val isFavorite: Boolean,
)

/**
 * A recurring window during which all apps on the block list are blocked.
 * [days] uses java.time.DayOfWeek values (1 = Monday .. 7 = Sunday) and refers
 * to the day the window STARTS on. Windows where end <= start wrap past
 * midnight into the next day; start == end means the full 24 hours.
 */
data class Schedule(
    val id: String,
    val label: String,
    val days: Set<Int>,
    val startMinute: Int,
    val endMinute: Int,
    val enabled: Boolean,
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("label", label)
        put("days", JSONArray(days.sorted()))
        put("start", startMinute)
        put("end", endMinute)
        put("enabled", enabled)
    }

    companion object {
        fun fromJson(o: JSONObject): Schedule {
            val daysArr = o.getJSONArray("days")
            val days = buildSet { for (i in 0 until daysArr.length()) add(daysArr.getInt(i)) }
            return Schedule(
                id = o.getString("id"),
                label = o.optString("label", ""),
                days = days,
                startMinute = o.getInt("start"),
                endMinute = o.getInt("end"),
                enabled = o.optBoolean("enabled", true),
            )
        }
    }
}

enum class BlockReason { FOCUS_MODE, SCHEDULE, LIMIT, MINDFUL, WEBSITE }

/** Why an app launch was intercepted; handed from the service to the UI. */
data class BlockedInfo(
    val packageName: String,
    val reason: BlockReason,
    val detail: String,
)

sealed class Decision {
    data object Allow : Decision()
    data class Block(val reason: BlockReason, val detail: String) : Decision()
}
