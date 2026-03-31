"use client"

import { useState, useEffect } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Switch } from "@/components/ui/switch"
import { GripVertical } from "lucide-react"
import { getWidgetPrefs, setWidgetPrefs, WIDGET_IDS, WIDGET_LABELS, type WidgetId, type WidgetPrefs } from "@/lib/dashboard-widgets"

function SortableItem({ id, label, visible, onToggle }: { id: string; label: string; visible: boolean; onToggle: (v: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded border mb-1 ${isDragging ? "opacity-50 border-[#00d4ff]" : "border-[#2a3650]/60"} bg-[#0a0e17]/60`}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-0.5 rounded hover:bg-[#2a3650]/60 cursor-grab active:cursor-grabbing text-[#8892a8]"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="flex-1 text-[9px] font-mono text-[#e2e8f0] truncate">{label}</span>
      <Switch
        checked={visible}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-[#00d4ff]/30"
      />
    </div>
  )
}

export default function WidgetlerConfigPanel() {
  const [prefs, setPrefsState] = useState<WidgetPrefs>(() => getWidgetPrefs())

  useEffect(() => {
    setPrefsState(getWidgetPrefs())
  }, [])

  const setPrefs = (next: WidgetPrefs) => {
    setPrefsState(next)
    setWidgetPrefs(next)
    window.dispatchEvent(new CustomEvent("dashboard-widget-prefs-change"))
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = prefs.order.indexOf(String(active.id))
    const newIndex = prefs.order.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    const newOrder = arrayMove(prefs.order, oldIndex, newIndex)
    setPrefs({ ...prefs, order: newOrder })
  }

  const handleToggle = (id: string, visible: boolean) => {
    setPrefs({
      ...prefs,
      visible: { ...prefs.visible, [id]: visible },
    })
  }

  return (
    <div className="px-1 py-1.5 space-y-2">
      <div className="text-[8px] font-mono text-[#818cf8] tracking-wider mb-2">WİDGET AYARLARI</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={prefs.order} strategy={verticalListSortingStrategy}>
          {prefs.order.map((id) => (
            <SortableItem
              key={id}
              id={id}
              label={WIDGET_LABELS[id as WidgetId] ?? id}
              visible={prefs.visible[id] !== false}
              onToggle={(v) => handleToggle(id, v)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <div className="text-[7px] text-[#8892a8] mt-2">Sürükleyerek sırala, düğme ile göster/gizle</div>
    </div>
  )
}
