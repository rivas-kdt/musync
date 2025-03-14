"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ref, onValue, off, query, orderByChild } from "firebase/database"
import { signInAnonymously } from "firebase/auth" // Correct import
import { db, auth } from "@/lib/firebase/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, LogOut, Music2, Lock } from "lucide-react"
import Link from "next/link"
import { signOut } from "firebase/auth"

interface Room {
  id: string
  name: string
  createdBy: string
  createdAt: number
  currentlyPlaying?: {
    videoId: string
    title: string
  }
  participants: number
  isPrivate?: boolean
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomCode, setRoomCode] = useState("")
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

  useEffect(() => {
    if (!user) return

    const fetchRooms = () => {
      const roomsRef = ref(db, "rooms")
      const roomsQuery = query(roomsRef, orderByChild("createdAt"))

      const unsubscribe = onValue(
        roomsQuery,
        (snapshot) => {
          if (snapshot.exists()) {
            const roomsData = snapshot.val()
            const roomsList = Object.entries(roomsData).map(([id, room]: [string, any]) => ({
              id,
              ...room,
            })) as Room[]

            // Filter rooms based on visibility rules:
            // 1. Show all public rooms
            // 2. Show private rooms only if the current user is the owner
            const visibleRooms = roomsList.filter(
              (room) => !room.isPrivate || (room.isPrivate && room.createdBy === user.uid),
            )

            setRooms(visibleRooms.reverse()) // Reverse to get newest first
          } else {
            setRooms([])
          }
        },
        (error) => {
          console.error("Error fetching rooms:", error)
        },
      )

      return () => off(roomsRef, "value", unsubscribe)
    }

    fetchRooms()
  }, [user])

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      router.push(`/room/${roomCode}`)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
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
    <div className="min-h-screen bg-background">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Link className="flex items-center justify-center" href="/dashboard">
          <Music2 className="h-6 w-6 mr-2" />
          <span className="font-bold">MusicSync</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">{user?.displayName || "Guest"}</span>
            {user?.isAnonymous && (
              <span className="text-xs bg-yellow-800 text-yellow-300 px-2 py-0.5 rounded-full">Guest</span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>
      <main className="container mx-auto py-6 px-4 md:px-6 space-y-8">
        <div className="flex flex-col md:flex-row gap-6 md:items-end">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">Welcome, {user?.displayName || "Guest"}</h1>
            <p className="text-muted-foreground">Join an existing room or create a new one to start listening.</p>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 md:w-64">
              <Label htmlFor="room-code" className="sr-only">
                Room Code
              </Label>
              <div className="flex w-full items-center space-x-2">
                <Input
                  id="room-code"
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                />
                <Button onClick={handleJoinRoom}>Join</Button>
              </div>
            </div>
            <Link href="/create-room">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Room
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Available Rooms</h2>
          {rooms.length === 0 ? (
            <p className="text-muted-foreground">No rooms available. Create one to get started!</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <Card key={room.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{room.name}</CardTitle>
                        <CardDescription>
                          {room.participants} {room.participants === 1 ? "listener" : "listeners"}
                        </CardDescription>
                      </div>
                      {room.isPrivate && (
                        <div className="flex items-center text-amber-500" title="Private Room">
                          <Lock className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {room.currentlyPlaying ? (
                      <p className="text-sm">
                        Now playing: <span className="font-medium">{room.currentlyPlaying.title}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No song currently playing</p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Link href={`/room/${room.id}`} className="w-full">
                      <Button variant="outline" className="w-full">
                        Join Room
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

