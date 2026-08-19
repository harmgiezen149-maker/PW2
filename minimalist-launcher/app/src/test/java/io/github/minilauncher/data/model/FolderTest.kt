package io.github.minilauncher.data.model

import org.json.JSONArray
import org.junit.Assert.assertEquals
import org.junit.Test

class FolderTest {

    @Test
    fun `round trips through json`() {
        val folder = Folder("id-1", "Social", listOf("com.a", "com.b"))
        val restored = Folder.fromJson(folder.toJson())
        assertEquals(folder, restored)
    }

    @Test
    fun `empty folder round trips`() {
        val folder = Folder("id-2", "Empty", emptyList())
        val restored = Folder.fromJson(folder.toJson())
        assertEquals(folder, restored)
    }

    @Test
    fun `serializes as a json array of objects`() {
        val folders = listOf(
            Folder("a", "One", listOf("com.x")),
            Folder("b", "Two", listOf("com.y", "com.z")),
        )
        val arr = JSONArray()
        folders.forEach { arr.put(it.toJson()) }
        val parsed = buildList {
            for (i in 0 until arr.length()) add(Folder.fromJson(arr.getJSONObject(i)))
        }
        assertEquals(folders, parsed)
    }
}
