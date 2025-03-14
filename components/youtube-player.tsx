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
  const bufferingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const forcePlayIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isPlayingRef = useRef<boolean>(isPlaying)
  const playerStateRef = useRef<number>(-1)
  const continuousPlayCheckRef = useRef<NodeJS.Timeout | null>(null)
  const pendingPlayRef = useRef<boolean>(false)
  const playAttemptCountRef = useRef<number>(0)

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

  // Setup continuous play check
  const setupContinuousPlayCheck = useCallback(() => {
    if (continuousPlayCheckRef.current) {
      clearInterval(continuousPlayCheckRef.current)
    }

    continuousPlayCheckRef.current = setInterval(() => {
      if (!playerRef.current) return

      try {
        const currentState = playerRef.current.getPlayerState()
        const currentTime = playerRef.current.getCurrentTime()
        const duration = playerRef.current.getDuration()

        // If the video is at or past the end (within last 1 second or beyond)
        if (currentTime >= duration - 1 || currentTime > duration) {
          console.log("Detected song end in continuous check", { currentTime, duration })
          onStateChange({
            target: playerRef.current,
            data: 0, // YouTube.PlayerState.ENDED
          })
        }
        // If the video should be playing but isn't
        else if (isPlayingRef.current && currentState !== 1) {
          console.log("Force playing video due to unexpected pause")
          playerRef.current.playVideo()
          pendingPlayRef.current = true
        }

        // If we have a pending play request, check if it's been fulfilled
        if (pendingPlayRef.current) {
          if (currentState === 1) {
            // Play request fulfilled
            pendingPlayRef.current = false
            playAttemptCountRef.current = 0
          } else if (playAttemptCountRef.current < 5) {
            // Try again up to 5 times
            playerRef.current.playVideo()
            playAttemptCountRef.current++
          } else {
            // Give up after 5 attempts
            pendingPlayRef.current = false
            playAttemptCountRef.current = 0
          }
        }
      } catch (error) {
        console.error("Error in continuous play check:", error)
      }
    }, 500) // Check more frequently (every 500ms)

    return () => {
      if (continuousPlayCheckRef.current) {
        clearInterval(continuousPlayCheckRef.current)
      }
    }
  }, [onStateChange])

  // Setup force play interval
  const setupForcePlayInterval = useCallback(() => {
    if (forcePlayIntervalRef.current) {
      clearInterval(forcePlayIntervalRef.current)
    }

    if (isPlayingRef.current) {
      forcePlayIntervalRef.current = setInterval(() => {
        if (playerRef.current && isPlayingRef.current) {
          try {
            const state = playerRef.current.getPlayerState()
            if (state !== 1) {
              // If not playing
              console.log("Force playing video")
              playerRef.current.playVideo()
              pendingPlayRef.current = true
            }
          } catch (error) {
            console.error("Error in force play interval:", error)
          }
        }
      }, 1000)
    }

    return () => {
      if (forcePlayIntervalRef.current) {
        clearInterval(forcePlayIntervalRef.current)
      }
    }
  }, [])

  // Handle buffering timeout
  const handleBuffering = useCallback(() => {
    setIsBuffering(true)

    // Clear existing timeout
    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current)
    }

    // Set new timeout
    bufferingTimeoutRef.current = setTimeout(() => {
      if (playerRef.current && isPlayingRef.current) {
        try {
          // If still buffering after timeout, try to seek slightly ahead
          const currentTime = playerRef.current.getCurrentTime()
          playerRef.current.seekTo(currentTime + 1, true)
          playerRef.current.playVideo()
          pendingPlayRef.current = true
        } catch (error) {
          console.error("Error handling buffering timeout:", error)
        }
      }
      setIsBuffering(false)
    }, 5000) // 5 second timeout for buffering
  }, [])

  // Debounced seek function to prevent too many seek operations
  const debouncedSeek = useCallback((time: number) => {
    const now = Date.now()
    // Only allow seeks every 2 seconds to prevent skipping
    if (now - lastSeekTimeRef.current > 2000 && playerRef.current) {
      try {
        // Store the current playing state
        const wasPlaying = isPlayingRef.current

        // Perform the seek
        playerRef.current.seekTo(time, true)
        lastSeekTimeRef.current = now

        // If it was playing before, ensure it continues playing
        if (wasPlaying) {
          playerRef.current.playVideo()
          pendingPlayRef.current = true
        }
      } catch (error) {
        console.error("Error seeking:", error)
      }
    } else if (seekDebounceTimeoutRef.current === null) {
      // If we can't seek now, schedule it for later
      seekDebounceTimeoutRef.current = setTimeout(
        () => {
          if (playerRef.current && mountedRef.current) {
            try {
              // Store the current playing state
              const wasPlaying = isPlayingRef.current

              // Perform the seek
              playerRef.current.seekTo(time, true)
              lastSeekTimeRef.current = Date.now()

              // If it was playing before, ensure it continues playing
              if (wasPlaying) {
                playerRef.current.playVideo()
                pendingPlayRef.current = true
              }
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
          pendingPlayRef.current = true
        } else {
          event.target.pauseVideo()
        }

        // Seek to the current time
        if (currentTime > 0) {
          event.target.seekTo(currentTime, true)
          lastSeekTimeRef.current = Date.now()
        }

        // Setup continuous play check
        setupContinuousPlayCheck()

        // Setup force play interval
        setupForcePlayInterval()
      } catch (error) {
        console.error("YouTube player initialization error:", error)
        setPlayerError(true)
      }
    },
    [onReady, onDurationChange, isPlaying, currentTime, setupContinuousPlayCheck, setupForcePlayInterval],
  )

  // Handle play/pause changes
  useEffect(() => {
    isPlayingRef.current = isPlaying

    if (isPlayerReady && playerRef.current && !playerError && (isCreator || allowOthersToListen)) {
      try {
        if (isPlaying) {
          console.log("Play command received")
          playerRef.current.playVideo()
          pendingPlayRef.current = true
          playAttemptCountRef.current = 0
          setupForcePlayInterval()
        } else {
          playerRef.current.pauseVideo()
          pendingPlayRef.current = false
          if (forcePlayIntervalRef.current) {
            clearInterval(forcePlayIntervalRef.current)
          }
        }
      } catch (error) {
        console.error("YouTube player control error:", error)
        setPlayerError(true)
      }
    }
  }, [isPlaying, isPlayerReady, isCreator, allowOthersToListen, playerError, setupForcePlayInterval])

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
      }
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current)
      }
      if (forcePlayIntervalRef.current) {
        clearInterval(forcePlayIntervalRef.current)
      }
      if (continuousPlayCheckRef.current) {
        clearInterval(continuousPlayCheckRef.current)
      }
    }
  }, [])

  // Handle player state changes
  const handlePlayerStateChange = useCallback(
    (event: YouTubeEvent) => {
      if (!playerRef.current || !isPlayerReady) return

      const playerState = event.data
      playerStateRef.current = playerState

      try {
        // Handle buffering
        if (playerState === 3) {
          // Buffering
          handleBuffering()
        } else {
          setIsBuffering(false)
          if (bufferingTimeoutRef.current) {
            clearTimeout(bufferingTimeoutRef.current)
          }
        }

        // If we were waiting for a play command to complete and now we're playing
        if (pendingPlayRef.current && playerState === 1) {
          pendingPlayRef.current = false
          playAttemptCountRef.current = 0
        }

        // Handle video end
        if (playerState === 0) {
          // Ended
          const currentTime = playerRef.current.getCurrentTime()
          const duration = playerRef.current.getDuration()

          // Only trigger end if we're actually near the end
          if (duration - currentTime <= 2) {
            onStateChange(event)
          } else {
            // If we're not actually at the end, resume playback
            if (isPlayingRef.current) {
              playerRef.current.playVideo()
              pendingPlayRef.current = true
            }
          }
        } else {
          onStateChange(event)
        }
      } catch (error) {
        console.error("Error handling player state change:", error)
      }
    },
    [isPlayerReady, onStateChange, handleBuffering],
  )

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

  return (
    <div className="youtube-player-container" style={{ opacity: 0.01, pointerEvents: "none", position: "fixed" }}>
      <YouTube
        videoId={videoId}
        opts={opts}
        onReady={handleReady}
        onStateChange={handlePlayerStateChange}
        onError={onError}
        className="w-full h-full"
      />
    </div>
  )
}

