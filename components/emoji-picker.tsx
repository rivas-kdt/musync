"use client"

import { useState, useRef, useEffect } from "react"
import { Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
}

// Common emoji categories
const emojis = {
  smileys: ["😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊", "😋", "😎", "🥰", "😍", "😘"],
  gestures: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "👋", "🤚", "🖐️"],
  people: ["🧑", "👨", "👩", "🧓", "👴", "👵", "👶", "👼", "👮", "🕵️", "💂", "👷", "🤴", "👸", "👳"],
  animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵"],
  food: ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝"],
  activities: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥅", "🏒", "🏑", "🥍"],
  music: ["🎵", "🎶", "🎼", "🎤", "🎧", "🎷", "🎸", "🎹", "🎺", "🎻", "🥁", "🪘", "🪕", "🪗", "📯"],
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<keyof typeof emojis>("smileys")
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close the popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full">
          <Smile className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent ref={popoverRef} className="p-0 w-80" side="top" align="end" sideOffset={5}>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 p-2 overflow-x-auto">
            {Object.keys(emojis).map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "default" : "ghost"}
                size="sm"
                className="text-xs"
                onClick={() => setActiveCategory(category as keyof typeof emojis)}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <div className="h-48 p-2 overflow-y-auto">
          <div className="grid grid-cols-8 gap-1">
            {emojis[activeCategory].map((emoji) => (
              <button
                key={emoji}
                className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleEmojiClick(emoji)}
              >
                <span className="text-lg">{emoji}</span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

