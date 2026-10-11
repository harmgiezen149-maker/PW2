package io.github.minilauncher.util

/** Injectable time source so schedule/limit logic is unit-testable. */
fun interface Clock {
    fun nowMillis(): Long

    companion object {
        val SYSTEM = Clock { System.currentTimeMillis() }
    }
}
