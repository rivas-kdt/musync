"use client"

import { useState, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Users, Shuffle } from "lucide-react"
import { SearchResults } from "@/components/search-results"
import { DraggableQueue } from "@/components/draggable-queue"
import { ParticipantsList } from "@/components/participants-list"
import { UserPlaylist } from "@/components/user-playlist"
import Link from "next/link"
import { toast } from "sonner"

interface Song {
  id: string
  videoId: string
  title: string
  thumbnail: string
  channelTitle: string
  addedBy: string
  addedByName: string
  addedByAnonymous?: boolean
  duration?: number
}

interface Participant {
  id: string
  displayName: string
  isAnonymous?: boolean
  lastActive: number
}

interface RoomSidebarProps {
  queue: Song[]
  participants: Participant[]
  creatorId: string
  isCreator: boolean
  userId: string
  isAnonymous: boolean
  onAddToQueue: (video: any) => void
  onReorderQueue: (newQueue: Song[]) => void
  onRemoveSong: (songId: string) => void
  onShuffleQueue: () => void
}

export function RoomSidebar({
  queue,
  participants,
  creatorId,
  isCreator,
  userId,
  isAnonymous,
  onAddToQueue,
  onReorderQueue,
  onRemoveSong,
  onShuffleQueue,
}: RoomSidebarProps) {
  const [activeTab, setActiveTab] = useState("queue")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchEngine, setSearchEngine] = useState<"1" | "2" | "3">("1")

  const searchYouTube = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)

    try {
      // Use different endpoints based on the selected search engine
      let endpoint
      switch (searchEngine) {
        case "1":
          endpoint = `/api/youtube/search?q=${encodeURIComponent(searchQuery)}`
          break
        case "2":
          endpoint = `/api/youtube/search2?q=${encodeURIComponent(searchQuery)}`
          break
        case "3":
          endpoint = `/api/youtube/search3?q=${encodeURIComponent(searchQuery)}`
          break
        default:
          endpoint = `/api/youtube/search?q=${encodeURIComponent(searchQuery)}`
      }

      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      setSearchResults(data.items || [])
    } catch (error) {
      console.error("Error searching YouTube:", error)

      // If the current search engine fails, try the next one automatically
      if (searchEngine === "1") {
        toast.error("API 1 failed. Trying API 2...")
        setSearchEngine("2")

        try {
          const altResponse = await fetch(`/api/youtube/alt-search?q=${encodeURIComponent(searchQuery)}`)
          if (altResponse.ok) {
            const altData = await altResponse.json()
            setSearchResults(altData.items || [])
            toast.success("Search completed with API 2")
          } else {
            // If API 2 also fails, try API 3
            toast.error("API 2 failed. Trying API 3...")
            setSearchEngine("3")

            try {
              const alt2Response = await fetch(`/api/youtube/alt-search2?q=${encodeURIComponent(searchQuery)}`)
              if (alt2Response.ok) {
                const alt2Data = await alt2Response.json()
                setSearchResults(alt2Data.items || [])
                toast.success("Search completed with API 3")
              } else {
                toast.error("All APIs failed. Please try again later.")
              }
            } catch (fallbackError2) {
              console.error("API 3 search failed:", fallbackError2)
              toast.error("All APIs failed. Please try again later.")
            }
          }
        } catch (fallbackError) {
          console.error("API 2 search failed:", fallbackError)

          // Try API 3 as a last resort
          toast.error("API 2 failed. Trying API 3...")
          setSearchEngine("3")

          try {
            const alt2Response = await fetch(`/api/youtube/alt-search2?q=${encodeURIComponent(searchQuery)}`)
            if (alt2Response.ok) {
              const alt2Data = await alt2Response.json()
              setSearchResults(alt2Data.items || [])
              toast.success("Search completed with API 3")
            } else {
              toast.error("All APIs failed. Please try again later.")
            }
          } catch (fallbackError2) {
            console.error("API 3 search failed:", fallbackError2)
            toast.error("All APIs failed. Please try again later.")
          }
        }
      } else if (searchEngine === "2") {
        // If API 2 fails, try API 3, then API 1
        toast.error("API 2 failed. Trying API 3...")
        setSearchEngine("3")

        try {
          const alt2Response = await fetch(`/api/youtube/alt-search2?q=${encodeURIComponent(searchQuery)}`)
          if (alt2Response.ok) {
            const alt2Data = await alt2Response.json()
            setSearchResults(alt2Data.items || [])
            toast.success("Search completed with API 3")
          } else {
            // Try API 1 as a last resort
            toast.error("API 3 failed. Trying API 1...")
            setSearchEngine("1")

            try {
              const primaryResponse = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`)
              if (primaryResponse.ok) {
                const primaryData = await primaryResponse.json()
                setSearchResults(primaryData.items || [])
                toast.success("Search completed with API 1")
              } else {
                toast.error("All APIs failed. Please try again later.")
              }
            } catch (fallbackError2) {
              console.error("API 1 search failed:", fallbackError2)
              toast.error("All APIs failed. Please try again later.")
            }
          }
        } catch (fallbackError) {
          console.error("API 3 search failed:", fallbackError)
          toast.error("Search failed. Please try another API.")
        }
      } else {
        // If API 3 fails, try API 1, then API 2
        toast.error("API 3 failed. Trying API 1...")
        setSearchEngine("1")

        try {
          const primaryResponse = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`)
          if (primaryResponse.ok) {
            const primaryData = await primaryResponse.json()
            setSearchResults(primaryData.items || [])
            toast.success("Search completed with API 1")
          } else {
            // Try API 2 as a last resort
            toast.error("API 1 failed. Trying API 2...")
            setSearchEngine("2")

            try {
              const altResponse = await fetch(`/api/youtube/alt-search?q=${encodeURIComponent(searchQuery)}`)
              if (altResponse.ok) {
                const altData = await altResponse.json()
                setSearchResults(altData.items || [])
                toast.success("Search completed with API 2")
              } else {
                toast.error("All APIs failed. Please try again later.")
              }
            } catch (fallbackError2) {
              console.error("API 2 search failed:", fallbackError2)
              toast.error("All APIs failed. Please try again later.")
            }
          }
        } catch (fallbackError) {
          console.error("API 1 search failed:", fallbackError)
          toast.error("Search failed. Please try another API.")
        }
      }
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddToQueue = useCallback(
    (video: any) => {
      onAddToQueue(video)
      setSearchQuery("")
      setSearchResults([])
    },
    [onAddToQueue],
  )

  return (
    <div className="w-[450px] border-l border-white/10 flex flex-col">
      <Tabs defaultValue="queue" value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="justify-start w-full h-12 px-2 border-b border-white/10">
          <TabsTrigger value="queue" className="data-[state=active]:bg-white/5">
            Queue
          </TabsTrigger>
          <TabsTrigger value="search" className="data-[state=active]:bg-white/5">
            Add Songs
          </TabsTrigger>
          <TabsTrigger value="playlist" className="data-[state=active]:bg-white/5">
            My Playlist
          </TabsTrigger>
          <TabsTrigger value="participants" className="data-[state=active]:bg-white/5">
            <Users className="w-4 h-4 mr-1" />
            {participants.length}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="flex-1 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Queue</h3>
            {isCreator && queue && queue.length > 1 && (
              <Button variant="outline" size="sm" onClick={onShuffleQueue}>
                <Shuffle className="w-4 h-4 mr-2" />
                Shuffle
              </Button>
            )}
          </div>
          <ScrollArea className="h-[calc(100vh-10rem)]">
            {Array.isArray(queue) && queue.length > 0 ? (
              <DraggableQueue
                songs={queue}
                onReorder={onReorderQueue}
                onRemove={onRemoveSong}
                isCreator={isCreator}
                userId={userId}
              />
            ) : (
              <p className="text-sm text-gray-400">The queue is empty. Add some songs!</p>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="search" className="flex-1 p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search for songs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      searchYouTube()
                    }
                  }}
                  className="bg-white/5 border-white/10"
                />
                <Button onClick={searchYouTube} disabled={isSearching} size="icon" variant="ghost">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {/* Simplified API selection buttons */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span>Search Engine:</span>
                  <div className="flex space-x-1">
                    <Button
                      variant={searchEngine === "1" ? "default" : "outline"}
                      size="sm"
                      className="p-0 h-7 w-7"
                      onClick={() => setSearchEngine("1")}
                    >
                      1
                    </Button>
                    <Button
                      variant={searchEngine === "2" ? "default" : "outline"}
                      size="sm"
                      className="p-0 h-7 w-7"
                      onClick={() => setSearchEngine("2")}
                    >
                      2
                    </Button>
                    <Button
                      variant={searchEngine === "3" ? "default" : "outline"}
                      size="sm"
                      className="p-0 h-7 w-7"
                      onClick={() => setSearchEngine("3")}
                    >
                      3
                    </Button>
                  </div>
                </div>
                {isSearching && <span className="text-gray-400">Searching...</span>}
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-14rem)]">
              {searchResults.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.map((video) => (
                    <SearchResults key={video.id.videoId} video={video} onAdd={() => handleAddToQueue(video)} />
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-400">Search for songs to add to the queue</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="playlist" className="flex-1 p-4">
          {!isAnonymous ? (
            <UserPlaylist userId={userId} onAddToQueue={onAddToQueue} />
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px]">
              <p className="mb-2 text-sm text-gray-400">Sign in to use playlists</p>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign in
                </Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="participants" className="flex-1 p-4">
          <h3 className="mb-4 text-sm font-medium">People in this room</h3>
          <ParticipantsList participants={participants} creatorId={creatorId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

