package io.github.minilauncher.blocking

import io.github.minilauncher.data.model.BlockedInfo

/**
 * In-process handoff between the accessibility service and the UI. If the
 * service cannot start BlockedActivity directly (background-launch
 * restrictions), HomeActivity picks this up in onResume after the forced
 * return home.
 */
object BlockState {
    @Volatile
    var pendingBlock: BlockedInfo? = null

    fun consumePendingBlock(): BlockedInfo? {
        val info = pendingBlock
        pendingBlock = null
        return info
    }
}
