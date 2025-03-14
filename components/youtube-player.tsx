"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import YouTube from "react-youtube"
import type { YouTubePlayer as YouTubePlayerType, YouTubeEvent, Options } from "react-youtube"

interface YouTubePlayerProps {
  videoId: string
  onReady: (player: YouTubePlayerType) => void
  onStateChange: (event: YouTubeEvent) => void
  onError: (event: YouTubeEvent) => void
  isPlaying: boolean
  currentTime: number
  isCreator: boolean
  allowOthersToListen: boolean
  onDurationChange: (duration: number) => void
  volume: number
  isTabVisible: boolean
}

export function YouTubePlayer({
  videoId,
  onReady,
  onStateChange,
  onError,
  isPlaying,
  currentTime,
  isCreator,
  allowOthersToListen,
  onDurationChange,
  volume,
  isTabVisible,
}: YouTubePlayerProps) {
  const playerRef = useRef<YouTubePlayerType | null>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const lastUpdateTimeRef = useRef<number>(0)
  const videoIdRef = useRef<string>(videoId)
  const mountedRef = useRef<boolean>(true)
  const volumeRef = useRef<number>(volume)
  const [playerError, setPlayerError] = useState<boolean>(false)
  const lastSeekTimeRef = useRef<number>(0)
  const seekDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isBuffering, setIsBuffering] = useState(false)

  // Track when videoId changes
  useEffect(() => {
    videoIdRef.current = videoId
    return () => {
      mountedRef.current = false
    }
  }, [videoId])

  // Reset player error state when videoId changes
  useEffect(() => {
    setPlayerError(false)
  }, [videoId])

  // Update volume ref when volume prop changes
  useEffect(() => {
    volumeRef.current = volume

    // Apply volume change to player if ready
    if (isPlayerReady && playerRef.current && !playerError) {
      try {
        playerRef.current.setVolume(volume)
      } catch (error) {
        console.error("Error setting volume:", error)
        setPlayerError(true)
      }
    }
  }, [volume, isPlayerReady, playerError])

  // Debounced seek function to prevent too many seek operations
  const debouncedSeek = useCallback((time: number) => {
    const now = Date.now()
    // Only allow seeks every 2 seconds to prevent skipping
    if (now - lastSeekTimeRef.current > 2000 && playerRef.current) {
      try {
        playerRef.current.seekTo(time, true)
        lastSeekTimeRef.current = now
      } catch (error) {
        console.error("Error seeking:", error)
      }
    } else if (seekDebounceTimeoutRef.current === null) {
      // If we can't seek now, schedule it for later
      seekDebounceTimeoutRef.current = setTimeout(
        () => {
          if (playerRef.current && mountedRef.current) {
            try {
              playerRef.current.seekTo(time, true)
              lastSeekTimeRef.current = Date.now()
            } catch (error) {
              console.error("Error in debounced seek:", error)
            }
          }
          seekDebounceTimeoutRef.current = null
        },
        2000 - (now - lastSeekTimeRef.current),
      )
    }
  }, [])

  const handleReady = useCallback(
    (event: YouTubeEvent) => {
      if (!mountedRef.current) return

      try {
        playerRef.current = event.target
        setIsPlayerReady(true)
        setPlayerError(false)
        onReady(event.target)

        const duration = event.target.getDuration()
        onDurationChange(duration)

        // Set initial volume
        event.target.setVolume(volumeRef.current)

        // Start playing immediately if isPlaying is true
        if (isPlaying) {
          event.target.playVideo()
        } else {
          event.target.pauseVideo()
        }

        // Seek to the current time
        if (currentTime > 0) {
          event.target.seekTo(currentTime, true)
          lastSeekTimeRef.current = Date.now()
        }

        // Enable background playback
        event.target.setOption("playerVars", { playsinline: 1 })
      } catch (error) {
        console.error("YouTube player initialization error:", error)
        setPlayerError(true)
      }
    },
    [onReady, onDurationChange, isPlaying, currentTime],
  )

  // Handle play/pause changes
  useEffect(() => {
    if (isPlayerReady && playerRef.current && !playerError && (isCreator || allowOthersToListen)) {
      try {
        if (isPlaying && playerRef.current.getPlayerState() !== 1) {
          playerRef.current.playVideo()
        } else if (!isPlaying && playerRef.current.getPlayerState() === 1) {
          playerRef.current.pauseVideo()
        }
      } catch (error) {
        console.error("YouTube player control error:", error)
        setPlayerError(true)
      }
    }
  }, [isPlaying, isPlayerReady, isCreator, allowOthersToListen, playerError])

  // Handle time sync
  useEffect(() => {
    if (isPlayerReady && playerRef.current && !playerError && (isCreator || allowOthersToListen)) {
      try {
        const now = Date.now()
        if (now - lastUpdateTimeRef.current > 1000) {
          const currentPlayerTime = playerRef.current.getCurrentTime()
          // Only seek if the difference is significant (more than 5 seconds)
          if (Math.abs(currentPlayerTime - currentTime) > 5) {
            debouncedSeek(currentTime)
          }
          lastUpdateTimeRef.current = now
        }
      } catch (error) {
        console.error("YouTube player sync error:", error)
        setPlayerError(true)
      }
    }
  }, [currentTime, isPlayerReady, isCreator, allowOthersToListen, playerError, debouncedSeek])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (seekDebounceTimeoutRef.current) {
        clearTimeout(seekDebounceTimeoutRef.current)
        seekDebounceTimeoutRef.current = null
      }
    }
  }, [])

  // Custom error handler
  const handleError = useCallback(
    (event: YouTubeEvent) => {
      console.error("YouTube Player Error:", event.data)
      setPlayerError(true)
      onError(event)
    },
    [onError],
  )

  // Handle tab visibility changes
  useEffect(() => {
    if (isPlayerReady && playerRef.current) {
      if (!isTabVisible && isPlaying) {
        // If tab is hidden and music should be playing, ensure it's playing
        playerRef.current.playVideo()
      } else if (isTabVisible && !isPlaying) {
        // If tab becomes visible and music should be paused, ensure it's paused
        playerRef.current.pauseVideo()
      }
    }
  }, [isTabVisible, isPlaying, isPlayerReady])

  const opts: Options = {
    height: "390",
    width: "640",
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      enablejsapi: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      origin: typeof window !== "undefined" ? window.location.origin : "",
      playsinline: 1,
      iv_load_policy: 3,
    },
  }

  const handlePlayerStateChange = useCallback((event: YouTubeEvent) => {
    if (!playerRef.current || !isPlayerReady) return

    const playerState = event.data

    try {
      const currentTime = playerRef.current.getCurrentTime()

      // Check for buffering state
      if (playerState === YouTube.PlayerState.BUFFERING) {
        console.log("Buffering detected")
        setIsBuffering(true)
        // Don't update play state here, just wait
      } else {
        setIsBuffering(false)
        // setLocalPlaybackState({
        //   isPlaying: playerState === YouTube.PlayerState.PLAYING,
        //   currentTime: currentTime,
        // })
      }

      // Update last player state
      // lastPlayerStateRef.current = playerState

      // if (isCreator) {
      //   const updateData = {
      //     "playbackState/isPlaying": playerState === YouTube.PlayerState.PLAYING,
      //     "playbackState/currentTime": currentTime,
      //     "playbackState/lastUpdated": serverTimestamp(),
      //   }

      //   await update(ref(db, `rooms/${roomId}`), updateData)
      // }

      // if (playerState === YouTube.PlayerState.ENDED) {
      //   // Video ended
      //   playNextSong()
      //   songEndTimeRef.current = null
      // }
    } catch (error) {
      console.error("Error handling player state change:", error)
    }
  }, [])

  const syncWithRoom = useCallback(() => {
    // if (!room || !playerReady || !playerRef.current) return
    // const { playbackState, currentlyPlaying } = room
    // if (!currentlyPlaying || !playbackState) return
    // const now = Date.now()
    // if (now - lastSyncTimeRef.current < 1000) return // Prevent too frequent syncs
    // let expectedTime = playbackState.currentTime
    // if (playbackState.lastUpdated) {
    //   const timeSinceLastUpdate = (now - playbackState.lastUpdated) / 1000
    //   expectedTime += playbackState.isPlaying ? timeSinceLastUpdate : 0
    // }
    // // Only update player if we're the creator or if others are allowed to listen
    // if ((isCreator || allowOthersToListen) && playerRef.current) {
    //   try {
    //     // Check if player is in a valid state before interacting with it
    //     if (typeof playerRef.current.getCurrentTime === "function") {
    //       const currentTime = playerRef.current.getCurrentTime()
    //       const playerState = playerRef.current.getPlayerState()
    //       // Only seek if the difference is significant (more than 5 seconds)
    //       // and we're not currently buffering
    //       if (Math.abs(currentTime - expectedTime) > 5 && !isBuffering) {
    //         playerRef.current.seekTo(expectedTime, true)
    //       }
    //       // Ensure play/pause state is correct
    //       if (playbackState.isPlaying && playerState !== YouTube.PlayerState.PLAYING && !isBuffering) {
    //         playerRef.current.playVideo()
    //       } else if (!playbackState.isPlaying && playerState === YouTube.PlayerState.PLAYING) {
    //         playerRef.current.pauseVideo()
    //       }
    //       // Store the current player state to detect unexpected changes
    //       lastPlayerStateRef.current = playerState
    //     }
    //   } catch (error) {
    //     console.error("Error syncing with room:", error)
    //     // If we encounter an error, we'll try to reinitialize the player on the next sync
    //     if (isCreator && currentlyPlaying) {
    //       // If we're the creator, try to play the next song if there's an error with the current one
    //       const errorCount = playerErrorCountRef.current || 0
    //       playerErrorCountRef.current = errorCount + 1
    //       // If we've had multiple errors, try to play the next song
    //       if (playerErrorCountRef.current > 3) {
    //         playNextSong()
    //         playerErrorCountRef.current = 0
    //       }
    //     }
    //   }
    // }
    // setLocalPlaybackState({
    //   isPlaying: playbackState.isPlaying,
    //   currentTime: expectedTime,
    // })
    // lastSyncTimeRef.current = now
    // // Check if song should end and we need to play the next one
    // if (isCreator && currentlyPlaying && duration > 0) {
    //   // If we don't have a song end time yet, calculate it
    //   if (songEndTimeRef.current === null) {
    //     songEndTimeRef.current = now + (duration - expectedTime) * 1000
    //   }
    //   // If we've reached the end time, play the next song
    //   if (now >= songEndTimeRef.current) {
    //     playNextSong()
    //     songEndTimeRef.current = null
    //   }
    // }
  }, [])

  return (
    <YouTube
      videoId={videoId}
      opts={opts}
      onReady={handleReady}
      onStateChange={handlePlayerStateChange}
      onError={handleError}
    />
  )
}

