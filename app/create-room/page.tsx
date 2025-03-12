"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ref, push, serverTimestamp, set } from "firebase/database"
import { signInAnonymously } from "firebase/auth" // Correct import
import { auth, db } from "@/lib/firebase/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default function CreateRoom() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [roomName, setRoomName] = useState("")
  const [error, setError] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [username, setUsername] = useState("")
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false)
  const router = useRouter()

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
      setLoading(false)
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

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError("You must be logged in to create a room")
      return
    }

    if (!roomName.trim()) {
      setError("Room name is required")
      return
    }

    setIsCreating(true)
    setError("")

    try {
      const roomData = {
        name: roomName,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        participants: 0,
        queue: {}, // Initialize as empty object for Firebase
        currentlyPlaying: null,
        playbackState: {
          isPlaying: false,
          currentTime: 0,
          lastUpdated: serverTimestamp(),
        },
        allowOthersToListen: true,
      }

      const newRoomRef = push(ref(db, "rooms"))
      await set(ref(db, `rooms/${newRoomRef.key}`), roomData)
      router.push(`/room/${newRoomRef.key}`)
    } catch (err: any) {
      setError(err.message || "Failed to create room")
    } finally {
      setIsCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (showUsernamePrompt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md p-6 rounded-lg bg-card border border-border">
          <h2 className="text-xl font-bold mb-4">Choose a display name</h2>
          <p className="text-muted-foreground mb-4">This name will be shown to others in the room.</p>
          <div className="space-y-4">
            <div>
              <Input placeholder="Enter a username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <Button onClick={handleSetUsername} className="w-full">
              Continue
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center">
            <Link href="/dashboard" className="mr-2">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <CardTitle className="text-2xl">Create a Room</CardTitle>
              <CardDescription>Set up a new music room for you and your friends</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateRoom} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="room-name">Room Name</Label>
              <Input
                id="room-name"
                placeholder="Enter a name for your room"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isCreating}>
              {isCreating ? "Creating room..." : "Create Room"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

