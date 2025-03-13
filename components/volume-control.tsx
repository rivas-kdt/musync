"use client"

import { useState, useEffect } from "react"
import * as Slider from "@radix-ui/react-slider"
import { Volume, Volume1, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VolumeControlProps {
  onVolumeChange: (volume: number) => void
  initialVolume?: number
}

export function VolumeControl({ onVolumeChange, initialVolume = 50 }: VolumeControlProps) {
  const [volume, setVolume] = useState(initialVolume)
  const [previousVolume, setPreviousVolume] = useState(initialVolume)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    // Initialize with the initial volume
    onVolumeChange(isMuted ? 0 : volume)
  }, [])

  const handleVolumeChange = (newValue: number[]) => {
    const newVolume = newValue[0]
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
    onVolumeChange(newVolume)
  }

  const toggleMute = () => {
    if (isMuted) {
      // Unmute - restore previous volume
      setIsMuted(false)
      onVolumeChange(volume)
    } else {
      // Mute - save current volume and set to 0
      setPreviousVolume(volume)
      setIsMuted(true)
      onVolumeChange(0)
    }
  }

  // Determine which volume icon to show based on volume level
  const VolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX size={16} />
    if (volume < 33) return <Volume size={16} />
    if (volume < 67) return <Volume1 size={16} />
    return <Volume2 size={16} />
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={toggleMute}>
        <VolumeIcon />
      </Button>
      <Slider.Root
        className="relative flex items-center w-24 h-5 select-none touch-none"
        value={[isMuted ? 0 : volume]}
        max={100}
        step={1}
        aria-label="Volume"
        onValueChange={(value) => handleVolumeChange(value)}
      >
        <Slider.Track className="relative h-1 rounded-full bg-white/20 grow">
          <Slider.Range className="absolute h-full bg-white rounded-full" />
        </Slider.Track>
        <Slider.Thumb className="block w-3 h-3 bg-white rounded-full hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white" />
      </Slider.Root>
    </div>
  )
}

