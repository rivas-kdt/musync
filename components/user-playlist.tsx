"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { getUserPlaylist, removeSongFromPlaylist } from "@/lib/playlist-service"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Trash2, Plus } from "lucide-react"
import { format } from "date-fns"

interface Song {
  id: string
  videoId: string
  title: string
  thumbnail: string
  channelTitle: string
  savedAt?: number
}

interface UserPlaylistProps {
  userId: string
  onAddToQueue: (song: any) => void
}

export function UserPlaylist({ userId, onAddToQueue }: UserPlaylistProps) {
  const [playlist, setPlaylist] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch the user's playlist
  const fetchPlaylist = async () => {
    if (!userId) return

    setLoading(true)
    const result = await getUserPlaylist(userId)

    if (result.success) {
      // Sort by most recently saved
      const sortedPlaylist = result.playlist.sort((a, b) => b.savedAt - a.savedAt)
      setPlaylist(sortedPlaylist)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPlaylist()
  }, [userId])

  // Remove a song from the playlist
  const handleRemove = async (e: React.MouseEvent, songId: string) => {
    e.stopPropagation() // Prevent triggering the parent onClick
    if (!userId) return

    const result = await removeSongFromPlaylist(userId, songId)
    if (result.success) {
      // Update the local playlist state
      setPlaylist(playlist.filter((song) => song.id !== songId))
    } else {
      setError(result.error)
    }
  }

  // Format the saved date
  const formatSavedDate = (timestamp?: number) => {
    if (!timestamp) return ""
    return format(new Date(timestamp), "MMM d, yyyy")
  }

  if (loading) {
    return <div className="py-4 text-center">Loading your playlist...</div>
  }

  if (error) {
    return <div className="py-4 text-center text-red-500">Error: {error}</div>
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Your Saved Songs</h3>

      {playlist.length === 0 ? (
        <p className="py-4 text-center text-gray-400">
          You haven't saved any songs yet. Play a song and click the save button to add it to your playlist.
        </p>
      ) : (
        <ScrollArea className="h-[calc(100vh-14rem)]">
          <div className="space-y-2">
            {playlist.map((song) => (
              <div key={song.id} className="flex items-center gap-3 p-2 w-[375px] rounded-md hover:bg-white/5">
                <img
                  src={song.thumbnail || "/placeholder.svg"}
                  alt={song.title}
                  className="object-cover w-12 h-12 rounded"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">{song.title}</h4>
                  <p className="text-xs text-gray-400 truncate">{song.channelTitle}</p>
                  <p className="text-xs text-gray-400">Saved on {formatSavedDate(song.savedAt)}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddToQueue(song)
                    }}
                    title="Add to queue"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-red-400 hover:text-red-300"
                    onClick={(e) => handleRemove(e, song.id)}
                    title="Remove from playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

