import { ref, set, push, get, remove } from "firebase/database"
import { db } from "./firebase/firebase"

// Add a song to a user's playlist
export async function addSongToPlaylist(userId: string, song: any) {
  if (!userId) return { success: false, error: "User not authenticated" }

  try {
    // Create a unique ID for the playlist item
    const playlistRef = ref(db, `users/${userId}/playlist`)
    const newSongRef = push(playlistRef)

    // Add song to playlist with timestamp
    await set(newSongRef, {
      ...song,
      savedAt: Date.now(),
      id: newSongRef.key,
    })

    return { success: true, songId: newSongRef.key }
  } catch (error: any) {
    console.error("Error adding song to playlist:", error)
    return { success: false, error: error.message }
  }
}

// Get a user's playlist
export async function getUserPlaylist(userId: string) {
  if (!userId) return { success: false, error: "User not authenticated" }

  try {
    const playlistRef = ref(db, `users/${userId}/playlist`)
    const snapshot = await get(playlistRef)

    if (snapshot.exists()) {
      const playlist: any[] = []
      snapshot.forEach((childSnapshot) => {
        playlist.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        })
      })
      return { success: true, playlist }
    } else {
      return { success: true, playlist: [] }
    }
  } catch (error: any) {
    console.error("Error getting user playlist:", error)
    return { success: false, error: error.message }
  }
}

// Remove a song from a user's playlist
export async function removeSongFromPlaylist(userId: string, songId: string) {
  if (!userId) return { success: false, error: "User not authenticated" }

  try {
    const songRef = ref(db, `users/${userId}/playlist/${songId}`)
    await remove(songRef)
    return { success: true }
  } catch (error: any) {
    console.error("Error removing song from playlist:", error)
    return { success: false, error: error.message }
  }
}

// Check if a song is in a user's playlist
export async function isSongInPlaylist(userId: string, videoId: string) {
  if (!userId) return { success: false, error: "User not authenticated" }

  try {
    const playlistRef = ref(db, `users/${userId}/playlist`)
    const snapshot = await get(playlistRef)

    if (snapshot.exists()) {
      let found = false
      snapshot.forEach((childSnapshot) => {
        const song = childSnapshot.val()
        if (song.videoId === videoId) {
          found = true
        }
      })
      return { success: true, inPlaylist: found }
    } else {
      return { success: true, inPlaylist: false }
    }
  } catch (error: any) {
    console.error("Error checking if song is in playlist:", error)
    return { success: false, error: error.message }
  }
}

