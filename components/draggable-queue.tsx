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
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

interface Song {
  id: string
  videoId: string
  title: string
  thumbnail: string
  channelTitle: string
  addedByName: string
  addedByAnonymous?: boolean
}

interface DraggableQueueProps {
  songs: Song[]
  onReorder: (songs: Song[]) => void
  isCreator: boolean
}

// Sortable item component
function SortableQueueItem({ song, position, isCreator }: { song: Song; position: number; isCreator: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: song.id,
    disabled: !isCreator,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
    position: "relative" as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-2 rounded-md ${isCreator ? "hover:bg-white/5" : ""}`}
    >
      {isCreator && (
        <div
          className="flex-shrink-0 text-gray-400 cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <div className="flex-shrink-0 w-4 text-center text-gray-400 font-medium">{position}</div>
      <img src={song.thumbnail || "/placeholder.svg"} alt={song.title} className="w-12 h-12 rounded object-cover" />
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{song.title}</h4>
        <p className="text-xs text-gray-400 truncate">{song.channelTitle}</p>
        <p className="text-xs text-gray-400 truncate">
          Added by {song.addedByName}
          {song.addedByAnonymous && " (Guest)"}
        </p>
      </div>
    </div>
  )
}

export function DraggableQueue({ songs, onReorder, isCreator }: DraggableQueueProps) {
  const [items, setItems] = useState<Song[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // Update items when songs prop changes, but only if we're not currently dragging
  useEffect(() => {
    if (!isDragging) {
      setItems(songs)
    }
  }, [songs, isDragging])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance required before activating
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragStart(event: DragStartEvent) {
    setIsDragging(true)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex((item) => item.id === active.id)
        const newIndex = currentItems.findIndex((item) => item.id === over.id)

        const newItems = arrayMove(currentItems, oldIndex, newIndex)
        onReorder(newItems)
        return newItems
      })
    }

    setIsDragging(false)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((song) => song.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-gray-400">The queue is empty. Add some songs!</p>
          ) : (
            items.map((song, index) => (
              <SortableQueueItem key={song.id} song={song} position={index + 1} isCreator={isCreator} />
            ))
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}

