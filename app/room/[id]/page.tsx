"use client"

import type React from "react"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { signInAnonymously } from "firebase/auth"
import { ref, onValue, off, set, push, update, serverTimestamp, increment, get } from "firebase/database"
import { auth, db } from "@/lib/firebase/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, Search, Send, Music, Play, Pause, SkipForward, Users, Shuffle, Bookmark, BookmarkCheck, } from "lucide-react"
import Link from "next/link"
import { YouTubePlayer } from "@/components/youtube-player"
import { SearchResults } from "@/components/search-results"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import type { YouTubePlayer as YouTubePlayerType, YouTubeEvent } from "react-youtube"
import { SeekBar } from "@/components/seek-bar"
import { VolumeControl } from "@/components/volume-control"
import { EmojiPicker } from "@/components/emoji-picker"
import { ParticipantsList } from "@/components/participants-list"
import { format } from "date-fns"
import { DraggableQueue } from "@/components/draggable-queue"
import { UserPlaylist } from "@/components/user-playlist"
import { addSongToPlaylist, getUserPlaylist, isSongInPlaylist, removeSongFromPlaylist } from "@/lib/playlist-service"

interface Message {
  id: string
  text: string
  userId: string
  username: string
  timestamp: number
  isAnonymous?: boolean
  isSystem?: boolean
}

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

interface Room {
  id: string
  name: string
  createdBy: string
  participants: number
  participantsList?: Record<string, Participant>
  queue: Song[]
  currentlyPlaying: Song | null
  playbackState: {
    isPlaying: boolean
    currentTime: number
    lastUpdated: number
  }
  allowOthersToListen: boolean
}

export default function RoomPage() {
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [room, setRoom] = useState<Room | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [localPlaybackState, setLocalPlaybackState] = useState({
    isPlaying: false,
    currentTime: 0,
  })
  const [allowOthersToListen, setAllowOthersToListen] = useState(true)
  const [canListen, setCanListen] = useState(false)
  const [duration, setDuration] = useState(0)
  const [username, setUsername] = useState("")
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false)
  const [isTabVisible, setIsTabVisible] = useState(true)
  const [skipVotes, setSkipVotes] = useState<Set<string>>(new Set())
  const [votesToSkip, setVotesToSkip] = useState(2)
  const [volume, setVolume] = useState(100)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [activeTab, setActiveTab] = useState("queue")
  const [isSongSaved, setIsSongSaved] = useState(false)
  const [isCheckingSaved, setIsCheckingSaved] = useState(false)

  const playerRef = useRef<YouTubePlayerType | null>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const checkQueueIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncTimeRef = useRef<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const songEndTimeRef = useRef<number | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const playerErrorCountRef = useRef<number>(0)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPlayerStateRef = useRef<number>(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  // Update the isTabVisible state when the visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden)
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  // Handle authentication (including anonymous)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        try {
          // Sign in anonymously if no user is logged in
          const credential = await signInAnonymously(auth)
          setUser({
            ...credential.user,
            isAnonymous: true,
            displayName: `Guest ${Math.floor(Math.random() * 1000)}`,
          })
          setShowUsernamePrompt(true)
        } catch (error) {
          console.error("Error signing in anonymously:", error)
        }
      } else {
        setUser(currentUser)
        if (currentUser.isAnonymous && !currentUser.displayName) {
          setShowUsernamePrompt(true)
        }
      }
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Set username for anonymous users
  const handleSetUsername = () => {
    if (!username.trim()) return

    if (user) {
      // Update local state
      setUser({
        ...user,
        displayName: username,
      })
      setShowUsernamePrompt(false)
    }
  }

  // Update document title when room name changes
  useEffect(() => {
    if (room?.name) {
      document.title = `${room.name}`
    } else {
      document.title = "Create Next App"
    }
  }, [room?.name])

  // Set up heartbeat to update participant status
  useEffect(() => {
    if (!user || !roomId) return

    const updatePresence = async () => {
      if (!user) return

      try {
        const participantRef = ref(db, `rooms/${roomId}/participantsList/${user.uid}`)
        await update(participantRef, {
          id: user.uid,
          displayName: user.displayName || `Guest ${Math.floor(Math.random() * 1000)}`,
          isAnonymous: user.isAnonymous,
          lastActive: serverTimestamp(),
        })
        // Count the current active participants and update the count
        const participantsListRef = ref(db, `rooms/${roomId}/participantsList`)
        const snapshot = await get(participantsListRef)
        if (snapshot.exists()) {
          const participantsCount = Object.keys(snapshot.val()).length
          await update(ref(db, `rooms/${roomId}`), {
            participants: participantsCount,
          })
        }
      } catch (error) {
        console.error("Error updating presence:", error)
      }
    }

    // Initial presence update
    updatePresence()

    // Set up interval for regular updates
    if (!heartbeatIntervalRef.current) {
      heartbeatIntervalRef.current = setInterval(updatePresence, 30000) // Every 30 seconds
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }

      // Remove participant when leaving
      if (user && roomId) {
        const participantRef = ref(db, `rooms/${roomId}/participantsList/${user.uid}`)
        set(participantRef, null)
          .then(() => {
            // Recount participants after removal
            const participantsListRef = ref(db, `rooms/${roomId}/participantsList`)
            return get(participantsListRef)
          })
          .then((snapshot) => {
            const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0
            return update(ref(db, `rooms/${roomId}`), {
              participants: count,
            })
          })
          .catch((error) => {
          console.error("Error removing participant:", error)
        })
      }
    }
  }, [user, roomId])

  useEffect(() => {
    if (!roomId) return

    const roomRef = ref(db, `rooms/${roomId}`)

    const handleRoomUpdate = (snapshot: any) => {
      if (snapshot.exists()) {
        const roomData = snapshot.val()
        setRoom((prevRoom) => {
          if (prevRoom) {
            const updatedRoom = {
              ...prevRoom,
              ...roomData,
              id: roomId,
            }

            // Ensure queue is always an array for consistency in the UI
            if (roomData.queue) {
              if (Array.isArray(roomData.queue)) {
                updatedRoom.queue = roomData.queue
              } else if (typeof roomData.queue === "object") {
                // Convert Firebase object to array
                updatedRoom.queue = Object.values(roomData.queue)
              }
            } else {
              updatedRoom.queue = []
            }

            // Process participants list
            if (roomData.participantsList) {
              const participantsArray = Object.values(roomData.participantsList) as Participant[]
              setParticipants(participantsArray)
            } else {
              setParticipants([])
            }

            // Only update local state if there's a significant change
            if (
              JSON.stringify(updatedRoom.currentlyPlaying) !== JSON.stringify(prevRoom.currentlyPlaying) ||
              Math.abs(updatedRoom.playbackState?.currentTime - (prevRoom.playbackState?.currentTime || 0)) > 5 ||
              updatedRoom.playbackState?.isPlaying !== prevRoom.playbackState?.isPlaying
            ) {
              // If we have a new song, reset the song end time
              if (JSON.stringify(updatedRoom.currentlyPlaying) !== JSON.stringify(prevRoom.currentlyPlaying)) {
                songEndTimeRef.current = null
                setLocalPlaybackState({
                  isPlaying: updatedRoom.playbackState?.isPlaying || false,
                  currentTime: updatedRoom.playbackState?.currentTime || 0,
                })
                // Check if the new song is saved in the user's playlist
                checkIfSongIsSaved(updatedRoom.currentlyPlaying?.videoId)
              } else if (updatedRoom.playbackState?.isPlaying !== prevRoom.playbackState?.isPlaying) {
                // If only play state changed, update that
                setLocalPlaybackState((prev) => ({
                  ...prev,
                  isPlaying: updatedRoom.playbackState?.isPlaying || false,
                }))
              } else if (
                Math.abs(updatedRoom.playbackState?.currentTime - (prevRoom.playbackState?.currentTime || 0)) > 5
              ) {
                // Only update time if it's significantly different
                setLocalPlaybackState((prev) => ({
                  ...prev,
                  currentTime: updatedRoom.playbackState?.currentTime || 0,
                }))
              }
            }
            setAllowOthersToListen(updatedRoom.allowOthersToListen)
            setIsCreator(updatedRoom.createdBy === user?.uid)
            setCanListen(updatedRoom.createdBy === user?.uid || updatedRoom.allowOthersToListen)
            return updatedRoom
          }

          // First time setting the room
          const newRoom = {
            id: roomId,
            ...roomData,
          }

          // Ensure queue is always an array for consistency in the UI
          if (roomData.queue) {
            if (Array.isArray(roomData.queue)) {
              newRoom.queue = roomData.queue
            } else if (typeof roomData.queue === "object") {
              // Convert Firebase object to array
              newRoom.queue = Object.values(roomData.queue)
            }
          } else {
            newRoom.queue = []
          }

          // Process participants list
          if (roomData.participantsList) {
            const participantsArray = Object.values(roomData.participantsList) as Participant[]
            setParticipants(participantsArray)
          }

          setIsCreator(roomData.createdBy === user?.uid)
          setCanListen(roomData.createdBy === user?.uid || roomData.allowOthersToListen)
          setAllowOthersToListen(roomData.allowOthersToListen || true)

          // Check if the current song is saved in the user's playlist
          checkIfSongIsSaved(newRoom.currentlyPlaying?.videoId)
          return newRoom
        })
      } else {
        router.push("/dashboard")
      }
    }

    onValue(roomRef, handleRoomUpdate)

    // Update participant count
    update(roomRef, {
      participants: increment(1),
    })

    const messagesRef = ref(db, `rooms/${roomId}/messages`)
    onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = snapshot.val()
        const messagesList = Object.entries(messagesData).map(([key, value]: [string, any]) => ({
          id: key,
          ...value,
        }))
        setMessages(messagesList)
      }
    })

    return () => {
      off(roomRef)
      off(messagesRef)

      update(roomRef, {
        participants: increment(-1),
      }).catch((error) => {
        console.error("Error updating participant count:", error)
      })

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }

      if (checkQueueIntervalRef.current) {
        clearInterval(checkQueueIntervalRef.current)
        checkQueueIntervalRef.current = null
      }
    }
  }, [roomId, router, user])

    // Check if the current song is saved in the user's playlist
    const checkIfSongIsSaved = async (videoId?: string) => {
      if (!user || user.isAnonymous || !videoId) {
        setIsSongSaved(false)
        return
      }
  
      setIsCheckingSaved(true)
      try {
        const result = await isSongInPlaylist(user.uid, videoId)
        if (result.success) {
          setIsSongSaved(result.inPlaylist)
        }
      } catch (error) {
        console.error("Error checking if song is saved:", error)
      } finally {
        setIsCheckingSaved(false)
      }
    }

  const playNextSong = useCallback(async () => {
    if (!room || !isCreator) return

    try {
      const roomRef = ref(db, `rooms/${roomId}`)

      // Get the latest queue data
      const queueRef = ref(db, `rooms/${roomId}/queue`)
      const queueSnapshot = await get(queueRef)

      if (queueSnapshot.exists()) {
        const queueData = queueSnapshot.val()

        // Check if queue is an array or an object
        let nextSong
        let newQueue

        if (Array.isArray(queueData) && queueData.length > 0) {
          // It's an array
          nextSong = queueData[0]
          newQueue = queueData.slice(1)
        } else if (typeof queueData === "object" && queueData !== null) {
          // It's an object (Firebase style)
          const queueKeys = Object.keys(queueData)
          if (queueKeys.length > 0) {
            const firstKey = queueKeys[0]
            nextSong = queueData[firstKey]

            // Create new queue without the first item
            newQueue = {}
            queueKeys.slice(1).forEach((key) => {
              newQueue[key] = queueData[key]
            })
          }
        }

        if (nextSong) {
          // Update the current playing song and remove it from the queue
          await update(roomRef, {
            currentlyPlaying: nextSong,
            queue: newQueue,
            "playbackState/isPlaying": true,
            "playbackState/currentTime": 0,
            "playbackState/lastUpdated": serverTimestamp(),
          })

          // Reset song end time
          songEndTimeRef.current = null

          // Reset skip votes
          setSkipVotes(new Set())

          // Reset player error count
          playerErrorCountRef.current = 0

          return
        }
      }

      // If we get here, there's no song in the queue
      await update(roomRef, {
        currentlyPlaying: null,
        "playbackState/isPlaying": false,
        "playbackState/currentTime": 0,
        "playbackState/lastUpdated": serverTimestamp(),
      })

      // Clear the player
      if (playerRef.current) {
        playerRef.current.stopVideo()
      }
      setLocalPlaybackState({
        isPlaying: false,
        currentTime: 0,
      })
      songEndTimeRef.current = null
      setSkipVotes(new Set())
      playerErrorCountRef.current = 0
    } catch (error) {
      console.error("Error playing next song:", error)
    }
  }, [room, isCreator, roomId])

  const syncWithRoom = useCallback(() => {
    if (!room || !playerReady || !playerRef.current) return

    const { playbackState, currentlyPlaying } = room
    if (!currentlyPlaying || !playbackState) return

    const now = Date.now()
    if (now - lastSyncTimeRef.current < 1000) return // Prevent too frequent syncs

    let expectedTime = playbackState.currentTime

    if (playbackState.lastUpdated) {
      const timeSinceLastUpdate = (now - playbackState.lastUpdated) / 1000
      expectedTime += playbackState.isPlaying ? timeSinceLastUpdate : 0
    }

    // Only update player if we're the creator or if others are allowed to listen
    if ((isCreator || allowOthersToListen) && playerRef.current) {
      try {
        // Check if player is in a valid state before interacting with it
        if (typeof playerRef.current.getCurrentTime === "function") {
          const currentTime = playerRef.current.getCurrentTime()
          const playerState = playerRef.current.getPlayerState()

          // Only seek if the difference is significant (more than 5 seconds)
          // This prevents small timing differences from causing seeks
          if (Math.abs(currentTime - expectedTime) > 5) {
            playerRef.current.seekTo(expectedTime, true)
          }

          // Ensure play/pause state is correct
          if (playbackState.isPlaying && playerState !== 1) {
            playerRef.current.playVideo()
          } else if (!playbackState.isPlaying && playerState === 1) {
            playerRef.current.pauseVideo()
          }

          // Store the current player state to detect unexpected changes
          lastPlayerStateRef.current = playerState
        }
      } catch (error) {
        console.error("Error syncing with room:", error)
        // If we encounter an error, we'll try to reinitialize the player on the next sync
        if (isCreator && currentlyPlaying) {
          // If we're the creator, try to play the next song if there's an error with the current one
          const errorCount = playerErrorCountRef.current || 0
          playerErrorCountRef.current = errorCount + 1

          // If we've had multiple errors, try to play the next song
          if (playerErrorCountRef.current > 3) {
            playNextSong()
            playerErrorCountRef.current = 0
          }
        }
      }
    }

    setLocalPlaybackState({
      isPlaying: playbackState.isPlaying,
      currentTime: expectedTime,
    })

    lastSyncTimeRef.current = now

    // Check if song should end and we need to play the next one
    if (isCreator && currentlyPlaying && duration > 0) {
      // If we don't have a song end time yet, calculate it
      if (songEndTimeRef.current === null) {
        songEndTimeRef.current = now + (duration - expectedTime) * 1000
      }

      // If we've reached the end time, play the next song
      if (now >= songEndTimeRef.current) {
        playNextSong()
        songEndTimeRef.current = null
      }
    }
  }, [room, playerReady, isCreator, allowOthersToListen, duration, playNextSong])

  const handlePlayerReady = useCallback(
    (player: YouTubePlayerType) => {
      playerRef.current = player
      setPlayerReady(true)
      playerErrorCountRef.current = 0 // Reset error count when player is ready

      // Force play if needed
      if (room?.playbackState?.isPlaying) {
        player.playVideo()
      }
    },
    [room?.playbackState?.isPlaying],
  )

  const handlePlayerStateChange = useCallback(
    async (event: YouTubeEvent) => {
      if (!room || !playerRef.current || !playerReady) return

      try {
        const currentTime = playerRef.current.getCurrentTime()
        const playerState = event.data

        // Check for unexpected state changes that might indicate skipping
        if (lastPlayerStateRef.current === 1 && playerState === 3) {
          console.log("Detected buffering during playback, may need to resync")
          // Don't update state here, let the sync function handle it
        } else {
          setLocalPlaybackState({
            isPlaying: playerState === 1,
            currentTime: currentTime,
          })
        }

        // Update last player state
        lastPlayerStateRef.current = playerState

        if (isCreator) {
          const updateData = {
            "playbackState/isPlaying": playerState === 1,
            "playbackState/currentTime": currentTime,
            "playbackState/lastUpdated": serverTimestamp(),
          }

          await update(ref(db, `rooms/${roomId}`), updateData)
        }

        if (playerState === 0) {
          // Video ended
          playNextSong()
          songEndTimeRef.current = null
        }
      } catch (error) {
        console.error("Error handling player state change:", error)
      }
    },
    [room, isCreator, roomId, playerReady, playNextSong],
  )

  const handlePlayerError = useCallback(
    (event: YouTubeEvent) => {
      console.error("YouTube Player Error:", event.data)

      // Increment error count
      const errorCount = playerErrorCountRef.current || 0
      playerErrorCountRef.current = errorCount + 1

      if (isCreator) {
        // If we've had multiple errors or specific error codes that indicate the video can't be played
        if (
          playerErrorCountRef.current > 3 ||
          event.data === 2 || // Invalid parameter
          event.data === 5 || // HTML5 player error
          event.data === 100 || // Video not found
          event.data === 101 || // Video not allowed to be embedded
          event.data === 150
        ) {
          // Video not allowed to be embedded (same as 101)

          console.log("Skipping to next song due to persistent player errors")
          playNextSong()
          songEndTimeRef.current = null
          playerErrorCountRef.current = 0
        }
      }
    },
    [isCreator, playNextSong],
  )

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current || !room || !playerReady || !isCreator) return

    const newPlaybackState = !localPlaybackState.isPlaying

    const roomRef = ref(db, `rooms/${roomId}`)
    update(roomRef, {
      "playbackState/isPlaying": newPlaybackState,
      "playbackState/currentTime": playerRef.current.getCurrentTime(),
      "playbackState/lastUpdated": serverTimestamp(),
    })

    setLocalPlaybackState((prev) => ({
      ...prev,
      isPlaying: newPlaybackState,
    }))

    // Explicitly play or pause the video
    if (newPlaybackState) {
      playerRef.current.playVideo()
    } else {
      playerRef.current.pauseVideo()
    }
  }, [room, roomId, playerReady, localPlaybackState.isPlaying, isCreator])

  // Add a function to handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji)
    // Focus the input after adding emoji
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !roomId || !user) return

    try {
      const lowerCaseMessage = newMessage.toLowerCase()

      // Check for skip vote commands
      if (lowerCaseMessage === "!skip" || lowerCaseMessage === "!vote skip") {
        handleSkipVote(user.uid)
        // Send a system message about the vote
        const messagesRef = ref(db, `rooms/${roomId}/messages`)
        await push(messagesRef, {
          text: `${user.displayName || "A user"} voted to skip the current song. (${skipVotes.size + 1}/${votesToSkip} votes)`,
          userId: "system",
          username: "System",
          timestamp: serverTimestamp(),
          isSystem: true,
        })
      } else {
        const messagesRef = ref(db, `rooms/${roomId}/messages`)
        await push(messagesRef, {
          text: newMessage,
          userId: user.uid,
          username: user.displayName || `Guest ${Math.floor(Math.random() * 1000)}`,
          timestamp: serverTimestamp(),
          isAnonymous: user.isAnonymous,
        })
      }

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const searchYouTube = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)

    try {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      setSearchResults(data.items || [])
    } catch (error) {
      console.error("Error searching YouTube:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const addToQueue = async (video: any) => {
    if (!roomId || !room || !user) return

    const song: Song = {
      id: Date.now().toString(),
      videoId: video.id.videoId || video.videoId,
      title: video.snippet?.title || video.title,
      thumbnail: video.snippet?.thumbnails?.default?.url || video.thumbnail,
      channelTitle: video.snippet?.channelTitle || video.channelTitle,
      addedBy: user.uid,
      addedByName: user.displayName || `Guest ${Math.floor(Math.random() * 1000)}`,
      addedByAnonymous: user.isAnonymous,
    }

    const roomRef = ref(db, `rooms/${roomId}`)

    try {
      if (!room.currentlyPlaying) {
        // Only set as currently playing if nothing is playing
        await update(roomRef, {
          currentlyPlaying: song,
          "playbackState/isPlaying": true,
          "playbackState/currentTime": 0,
          "playbackState/lastUpdated": serverTimestamp(),
        })

        // Reset song end time
        songEndTimeRef.current = null
      } else {
        // Otherwise add to queue
        // First check if queue exists
        const queueRef = ref(db, `rooms/${roomId}/queue`)
        const queueSnapshot = await get(queueRef)

        if (queueSnapshot.exists()) {
          // Queue exists, push to it
          await push(queueRef, song)
        } else {
          // Queue doesn't exist, create it with the song
          await set(queueRef, [song])
        }
      }

      setSearchQuery("")
      setSearchResults([])
      toast.success("Song added to queue")
    } catch (error) {
      console.error("Error adding to queue:", error)
      toast.error("Failed to add song to queue")
    }
  }

  const toggleAllowOthersToListen = useCallback(async () => {
    if (!isCreator || !room) return

    const newAllowOthersToListen = !allowOthersToListen
    setAllowOthersToListen(newAllowOthersToListen)

    const roomRef = ref(db, `rooms/${roomId}`)
    await update(roomRef, {
      allowOthersToListen: newAllowOthersToListen,
    })
  }, [isCreator, room, roomId, allowOthersToListen])

  const handleSkipVote = useCallback((userId: string) => {
    setSkipVotes((prevVotes) => {
      const newVotes = new Set(prevVotes)
      if (newVotes.has(userId)) {
        newVotes.delete(userId)
      } else {
        newVotes.add(userId)
      }
      return newVotes
    })
  }, [])

  // Set up sync interval
  useEffect(() => {
    if (room && playerReady) {
      syncWithRoom()

      if (!syncIntervalRef.current) {
        syncIntervalRef.current = setInterval(syncWithRoom, 1000) // More frequent updates (every second)
      }

      // Set up interval to check queue and auto-play next song even when tab is not in focus
      if (isCreator && !checkQueueIntervalRef.current) {
        checkQueueIntervalRef.current = setInterval(() => {
          if (room.currentlyPlaying && duration > 0) {
            const now = Date.now()

            // If we don't have a song end time yet, calculate it
            if (songEndTimeRef.current === null && playerRef.current) {
              try {
                const currentTime = playerRef.current.getCurrentTime()
                songEndTimeRef.current = now + (duration - currentTime) * 1000
              } catch (error) {
                console.error("Error getting current time:", error)
              }
            }

            // If we've reached the end time, play the next song
            if (songEndTimeRef.current !== null && now >= songEndTimeRef.current) {
              playNextSong()
              songEndTimeRef.current = null
            }
          }
        }, 1000)
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }

      if (checkQueueIntervalRef.current) {
        clearInterval(checkQueueIntervalRef.current)
        checkQueueIntervalRef.current = null
      }
    }
  }, [room, playerReady, syncWithRoom, isCreator, duration, playNextSong])

  const handleDurationChange = useCallback((newDuration: number) => {
    setDuration(newDuration)

    // Reset song end time when duration changes
    songEndTimeRef.current = null
  }, [])

  const handleSeek = useCallback(
    (newTime: number) => {
      if (!isCreator || !playerRef.current) return

      try {
        playerRef.current.seekTo(newTime, true)
        setLocalPlaybackState((prev) => ({ ...prev, currentTime: newTime }))

        const roomRef = ref(db, `rooms/${roomId}`)
        update(roomRef, {
          "playbackState/currentTime": newTime,
          "playbackState/lastUpdated": serverTimestamp(),
        })
      } catch (error) {
        console.error("Error seeking:", error)
      }
    },
    [isCreator, roomId],
  )

  // Format timestamp for chat messages
  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return ""

    try {
      // If timestamp is a Firebase server timestamp
      if (typeof timestamp === "object" && timestamp.toDate) {
        return format(timestamp.toDate(), "h:mm a")
      }

      // If timestamp is a number (milliseconds)
      if (typeof timestamp === "number") {
        return format(new Date(timestamp), "h:mm a")
      }

      // If timestamp is already a Date object
      if (timestamp instanceof Date) {
        return format(timestamp, "h:mm a")
      }

      // For other cases, try to convert to date
      return format(new Date(timestamp), "h:mm a")
    } catch (error) {
      console.error("Error formatting timestamp:", error)
      return ""
    }
  }

  // Check if we have enough votes to skip
  useEffect(() => {
    if (skipVotes.size >= votesToSkip && room?.currentlyPlaying && isCreator) {
      playNextSong()
    }
  }, [skipVotes, votesToSkip, room?.currentlyPlaying, playNextSong, isCreator])

  // Handle queue reordering
  const handleQueueReorder = useCallback(
    async (newQueue: Song[]) => {
      if (!isCreator || !roomId) return

      try {
        const roomRef = ref(db, `rooms/${roomId}`)
        await update(roomRef, {
          queue: newQueue,
        })
      } catch (error) {
        console.error("Error reordering queue:", error)
      }
    },
    [isCreator, roomId],
  )

  const handleSaveSong = async () => {
    if (!user || !room?.currentlyPlaying || user.isAnonymous) {
      toast.error("You need to be logged in to save songs")
      return
    }

    try {
      if (isSongSaved) {
        // Find the song ID in the playlist
        const result = await getUserPlaylist(user.uid)
        if (result.success) {
          const song = result.playlist.find((s) => s.videoId === room.currentlyPlaying.videoId)
          if (song) {
            await removeSongFromPlaylist(user.uid, song.id)
            setIsSongSaved(false)
            toast.success("Song removed from your playlist")
          }
        }
      } else {
        const result = await addSongToPlaylist(user.uid, room.currentlyPlaying)
        if (result.success) {
          setIsSongSaved(true)
          toast.success("Song saved to your playlist")
        } else {
          toast.error("Failed to save song")
        }
      }
    } catch (error) {
      console.error("Error saving song:", error)
      toast.error("An error occurred while saving the song")
    }
  }

  //shuffleQueue
  const shuffleQueue = useCallback(async () => {
    if (!isCreator || !roomId || !room?.queue || room.queue.length < 2) return

    try {
      // Create a copy of the queue
      const queueCopy = [...room.queue]

      // Fisher-Yates shuffle algorithm
      for (let i = queueCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[queueCopy[i], queueCopy[j]] = [queueCopy[j], queueCopy[i]]
      }

      // Update the queue in Firebase
      const roomRef = ref(db, `rooms/${roomId}`)
      await update(roomRef, {
        queue: queueCopy,
      })

      toast.success("Queue shuffled")
    } catch (error) {
      console.error("Error shuffling queue:", error)
      toast.error("Failed to shuffle queue")
    }
  }, [isCreator, roomId, room?.queue])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  if (showUsernamePrompt) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white bg-black">
        <div className="w-full max-w-md p-6 bg-gray-900 border border-gray-800 rounded-lg">
          <h2 className="mb-4 text-xl font-bold">Choose a display name</h2>
          <p className="mb-4 text-gray-400">This name will be shown to others in the room.</p>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Enter a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <Button onClick={handleSetUsername} className="w-full">
              Continue to Room
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading room...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen text-white bg-black">
      <header className="flex items-center px-4 border-b h-14 border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">{room.name}</span>
        </Link>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-400">
            {room.participants} {room.participants === 1 ? "listener" : "listeners"}
          </span>
          {user?.isAnonymous && (
            <span className="text-xs bg-yellow-800 text-yellow-300 px-2 py-0.5 rounded-full">Guest</span>
          )}
          {isCreator && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm">Allow others to listen:</span>
              <Switch checked={allowOthersToListen} onCheckedChange={toggleAllowOthersToListen} />
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex flex-col flex-1">
          {/* Current song info */}
          <div className="p-4 border-b border-white/10">
            {room.currentlyPlaying ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={room.currentlyPlaying.thumbnail || "/placeholder.svg"}
                    alt={room.currentlyPlaying.title}
                    className="object-cover w-16 h-16 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-medium truncate">{room.currentlyPlaying.title}</h2>
                    <p className="text-sm text-gray-400">
                      {room.currentlyPlaying.channelTitle} • Added by {room.currentlyPlaying.addedByName}
                      {room.currentlyPlaying.addedByAnonymous && " (Guest)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCreator && (
                      <>
                        <Button variant="ghost" size="icon" onClick={togglePlayPause} disabled={!playerReady}>
                          {localPlaybackState.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={playNextSong}
                          disabled={!playerReady || !room.queue || room.queue.length === 0}
                        >
                          <SkipForward className="w-5 h-5" />
                        </Button>
                      </>
                    )}
                    {!user?.isAnonymous && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSaveSong}
                        disabled={isCheckingSaved}
                        title={isSongSaved ? "Song saved to your playlist" : "Save to your playlist"}
                      >
                        {isSongSaved ? (
                          <BookmarkCheck className="w-5 h-5 text-green-500" />
                        ) : (
                          <Bookmark className="w-5 h-5" />
                        )}
                      </Button>
                    )}
                    <VolumeControl onVolumeChange={setVolume} initialVolume={volume} />
                  </div>
                </div>
                <SeekBar
                  currentTime={localPlaybackState.currentTime}
                  duration={duration}
                  onSeek={handleSeek}
                  isCreator={isCreator}
                />
              </div>
            ) : (
              <div className="py-4 text-center">
                <Music className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-400">No song playing</p>
              </div>
            )}
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-4" ref={scrollAreaRef}>
              {messages.length === 0 ? (
                <p className="py-8 text-center text-gray-400">No messages yet. Start the conversation!</p>
              ) : (
                <div className="py-4 space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="flex items-start gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className={message.isAnonymous ? "bg-yellow-800" : ""}>
                          {message.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{message.username}</span>
                          {message.isAnonymous && (
                            <span className="text-xs bg-yellow-800 text-yellow-300 px-1.5 py-0.5 rounded-full">
                              Guest
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{formatMessageTime(message.timestamp)}</span>
                        </div>
                        <p className="text-sm text-gray-200">{message.text}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat input */}
          <div className="p-4 border-t border-white/10">
            <form onSubmit={sendMessage}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    placeholder="Type a message... (Type !skip to vote skip)"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="pr-10 bg-white/5 border-white/10"
                  />
                  <div className="absolute transform -translate-y-1/2 right-2 top-1/2">
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  </div>
                </div>
                <Button type="submit" size="icon" variant="ghost">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col border-l w-[400px] border-white/10">
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
                {isCreator && room.queue && room.queue.length > 1 && (
                  <Button variant="outline" size="sm" onClick={shuffleQueue}>
                    <Shuffle className="w-4 h-4 mr-2" />
                    Shuffle
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[calc(100vh-10rem)]">
                {Array.isArray(room.queue) && room.queue.length > 0 ? (
                  <DraggableQueue songs={room.queue} onReorder={handleQueueReorder} isCreator={isCreator} />
                ) : (
                  <p className="text-sm text-gray-400">The queue is empty. Add some songs!</p>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="search" className="flex-1 p-4">
              <div className="space-y-4">
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

                <ScrollArea className="h-[calc(100vh-14rem)]">
                  {isSearching ? (
                    <p className="py-4 text-center text-gray-400">Searching...</p>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-4">
                      {searchResults.map((video) => (
                        <SearchResults key={video.id.videoId} video={video} onAdd={() => addToQueue(video)} />
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
              {user && !user.isAnonymous ? (
                <UserPlaylist userId={user.uid} onAddToQueue={addToQueue} />
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
              <ParticipantsList participants={participants} creatorId={room.createdBy} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Hidden video player */}
        <div className="hidden">
          {canListen && room?.currentlyPlaying && (
            <div key={room.currentlyPlaying.videoId} className="youtube-player-container">
              <YouTubePlayer
                videoId={room.currentlyPlaying.videoId}
                onReady={handlePlayerReady}
                onStateChange={handlePlayerStateChange}
                onError={handlePlayerError}
                isPlaying={localPlaybackState.isPlaying}
                currentTime={localPlaybackState.currentTime}
                isCreator={isCreator}
                allowOthersToListen={allowOthersToListen}
                onDurationChange={handleDurationChange}
                volume={volume}
                isTabVisible={isTabVisible}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

