package io.github.minilauncher.ui.settings

import android.app.TimePickerDialog
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import io.github.minilauncher.R
import io.github.minilauncher.data.Prefs
import io.github.minilauncher.data.model.Schedule
import io.github.minilauncher.ui.common.BaseActivity
import java.util.UUID

/** List, create, edit and delete blocking schedules. */
class ScheduleEditorActivity : BaseActivity() {

    private lateinit var prefs: Prefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_schedules)
        prefs = Prefs.get(this)
        findViewById<TextView>(R.id.addScheduleButton).setOnClickListener {
            editSchedule(
                Schedule(
                    id = UUID.randomUUID().toString(),
                    label = "",
                    days = setOf(1, 2, 3, 4, 5),
                    startMinute = 9 * 60,
                    endMinute = 17 * 60,
                    enabled = true,
                ),
                isNew = true,
            )
        }
    }

    override fun onResume() {
        super.onResume()
        render()
    }

    private fun render() {
        val container = findViewById<LinearLayout>(R.id.schedulesContainer)
        container.removeAllViews()
        val schedules = prefs.schedules
        if (schedules.isEmpty()) {
            val view = layoutInflater.inflate(R.layout.item_app_text, container, false) as TextView
            view.text = getString(R.string.schedules_empty)
            container.addView(view)
        }
        schedules.forEach { schedule ->
            val view = layoutInflater.inflate(R.layout.item_setting_row, container, false)
            view.findViewById<TextView>(R.id.rowTitle).text = describe(schedule)
            view.findViewById<TextView>(R.id.rowValue).text =
                if (schedule.enabled) getString(R.string.state_on) else getString(R.string.state_off)
            view.setOnClickListener { editSchedule(schedule, isNew = false) }
            container.addView(view)
        }
    }

    private fun describe(s: Schedule): String {
        val dayNames = resources.getStringArray(R.array.day_names_short)
        val days = s.days.sorted().joinToString(" ") { dayNames[it - 1] }
        val name = s.label.ifBlank { getString(R.string.schedule_default_name) }
        return "$name · $days · ${fmt(s.startMinute)}–${fmt(s.endMinute)}"
    }

    private fun fmt(minute: Int): String = "%02d:%02d".format(minute / 60, minute % 60)

    private fun editSchedule(initial: Schedule, isNew: Boolean) {
        var working = initial
        val dayNames = resources.getStringArray(R.array.day_names)
        val checked = BooleanArray(7) { (it + 1) in working.days }

        val builder = AlertDialog.Builder(this)
            .setTitle(if (isNew) R.string.schedule_new else R.string.schedule_edit)
            .setMultiChoiceItems(dayNames, checked) { _, which, isChecked -> checked[which] = isChecked }
            .setPositiveButton(R.string.schedule_save) { _, _ ->
                working = working.copy(
                    days = buildSet { checked.forEachIndexed { i, c -> if (c) add(i + 1) } },
                )
                pickTimes(working, isNew)
            }
            .setNegativeButton(android.R.string.cancel, null)
        if (!isNew) {
            builder.setNeutralButton(R.string.schedule_delete) { _, _ ->
                prefs.schedules = prefs.schedules.filterNot { it.id == working.id }
                render()
            }
        }
        builder.show()
    }

    private fun pickTimes(schedule: Schedule, isNew: Boolean) {
        TimePickerDialog(
            this,
            { _, startHour, startMin ->
                TimePickerDialog(
                    this,
                    { _, endHour, endMin ->
                        save(
                            schedule.copy(
                                startMinute = startHour * 60 + startMin,
                                endMinute = endHour * 60 + endMin,
                            ),
                            isNew,
                        )
                    },
                    schedule.endMinute / 60,
                    schedule.endMinute % 60,
                    true,
                ).apply { setTitle(getString(R.string.schedule_end_time)) }.show()
            },
            schedule.startMinute / 60,
            schedule.startMinute % 60,
            true,
        ).apply { setTitle(getString(R.string.schedule_start_time)) }.show()
    }

    private fun save(schedule: Schedule, isNew: Boolean) {
        prefs.schedules = if (isNew) {
            prefs.schedules + schedule
        } else {
            prefs.schedules.map { if (it.id == schedule.id) schedule else it }
        }
        render()
    }
}
