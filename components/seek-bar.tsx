"use client"

import * as Slider from "@radix-ui/react-slider"
import { formatTime } from "@/utils/formatTime"

interface SeekBarProps {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  isCreator: boolean
}

export function SeekBar({ currentTime, duration, onSeek, isCreator }: SeekBarProps) {
  const handleSeek = (newValue: number[]) => {
    if (isCreator) {
      onSeek(newValue[0])
    }
  }

  // Add a small delay before triggering the seek to avoid multiple rapid seeks
  const handleValueCommit = (newValue: number[]) => {
    if (isCreator) {
      onSeek(newValue[0])
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-400 w-12">{formatTime(currentTime)}</span>
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={[currentTime]}
        max={duration}
        step={1}
        aria-label="Song progress"
        onValueChange={handleSeek}
        onValueCommit={handleValueCommit}
        disabled={!isCreator}
      >
        <Slider.Track className="bg-white/20 relative grow rounded-full h-1">
          <Slider.Range className="absolute bg-white rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb className="block w-3 h-3 bg-white rounded-full hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white" />
      </Slider.Root>
      <span className="text-sm text-gray-400 w-12">{formatTime(duration)}</span>
    </div>
  )
}

