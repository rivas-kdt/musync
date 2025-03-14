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
import { GripVertical, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Song {
  id: string
  videoId: string
  title: string
  thumbnail: string
  channelTitle: string
  addedByName: string
  addedBy: string
  addedByAnonymous?: boolean
}

interface DraggableQueueProps {
  songs: Song[]
  onReorder: (songs: Song[]) => void
  onRemove: (songId: string) => void
  isCreator: boolean
  userId: string
}

// Sortable item component
function SortableQueueItem({
  song,
  position,
  isCreator,
  onRemove,
  userId,
}: {
  song: Song
  position: number
  isCreator: boolean
  onRemove: (songId: string) => void
  userId: string
}) {
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

  // Check if user can remove this song (creator or the person who added it)
  const canRemove = isCreator || song.addedBy === userId

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
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      <div className="flex-shrink-0 w-4 font-medium text-center text-gray-400">{position}</div>
      <img src={song.thumbnail || "/placeholder.svg"} alt={song.title} className="object-cover w-12 h-12 rounded" />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium truncate">{song.title}</h4>
        <p className="text-xs text-gray-400 truncate">{song.channelTitle}</p>
        <p className="text-xs text-gray-400 truncate">
          Added by {song.addedByName}
          {song.addedByAnonymous && " (Guest)"}
        </p>
      </div>
      {canRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
          onClick={() => onRemove(song.id)}
          title="Remove from queue"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

export function DraggableQueue({ songs, onReorder, onRemove, isCreator, userId }: DraggableQueueProps) {
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
              <SortableQueueItem
                key={song.id}
                song={song}
                position={index + 1}
                isCreator={isCreator}
                onRemove={onRemove}
                userId={userId}
              />
            ))
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}

