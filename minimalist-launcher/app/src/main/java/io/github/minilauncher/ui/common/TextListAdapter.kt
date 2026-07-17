package io.github.minilauncher.ui.common

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import io.github.minilauncher.R

/** Minimalist text-only list row used by the home screen and app drawer. */
class TextListAdapter(
    private val onClick: (position: Int) -> Unit,
    private val onLongClick: (position: Int) -> Unit = {},
) : RecyclerView.Adapter<TextListAdapter.Holder>() {

    private var items: List<String> = emptyList()

    fun submit(newItems: List<String>) {
        items = newItems
        @Suppress("NotifyDataSetChanged")
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_app_text, parent, false)
        return Holder(view)
    }

    override fun onBindViewHolder(holder: Holder, position: Int) {
        (holder.itemView as TextView).text = items[position]
    }

    override fun getItemCount(): Int = items.size

    inner class Holder(view: View) : RecyclerView.ViewHolder(view) {
        init {
            view.setOnClickListener {
                val pos = bindingAdapterPosition
                if (pos != RecyclerView.NO_POSITION) onClick(pos)
            }
            view.setOnLongClickListener {
                val pos = bindingAdapterPosition
                if (pos != RecyclerView.NO_POSITION) onLongClick(pos)
                true
            }
        }
    }
}
