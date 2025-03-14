"use client"

import { useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Globe, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ref, update, push, serverTimestamp } from "firebase/database"
import { db } from "@/lib/firebase/firebase"
import { toast } from "sonner"

interface RoomHeaderProps {
  roomId: string
  roomName: string
  participants: number
  isCreator: boolean
  isUserAnonymous?: boolean
  isPrivate: boolean
  allowOthersToListen: boolean
  onToggleAllowOthersToListen: (value: boolean) => void
}

export function RoomHeader({
  roomId,
  roomName,
  participants,
  isCreator,
  isUserAnonymous = false,
  isPrivate,
  allowOthersToListen,
  onToggleAllowOthersToListen,
}: RoomHeaderProps) {
  // Toggle room privacy
  const toggleRoomPrivacy = useCallback(async () => {
    if (!isCreator) return

    const newPrivacyStatus = !isPrivate

    const roomRef = ref(db, `rooms/${roomId}`)
    await update(roomRef, {
      isPrivate: newPrivacyStatus,
    })

    // Send a system message about the privacy change
    const messagesRef = ref(db, `rooms/${roomId}/messages`)
    await push(messagesRef, {
      text: `Room is now ${newPrivacyStatus ? "private" : "public"}`,
      userId: "system",
      username: "System",
      timestamp: serverTimestamp(),
      isSystem: true,
    })

    toast.success(`Room is now ${newPrivacyStatus ? "private" : "public"}`)
  }, [isCreator, roomId, isPrivate])

  return (
    <header className="h-14 flex items-center px-4 border-b border-white/10">
      <Link href="/dashboard" className="flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        <span className="font-medium">{roomName}</span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-sm text-gray-400">
          {participants} {participants === 1 ? "listener" : "listeners"}
        </span>
        {isUserAnonymous && (
          <span className="text-xs bg-yellow-800 text-yellow-300 px-2 py-0.5 rounded-full">Guest</span>
        )}
        {isCreator && (
          <>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm">Allow others to listen:</span>
              <Switch checked={allowOthersToListen} onCheckedChange={onToggleAllowOthersToListen} />
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm">Room privacy:</span>
              <Button variant="ghost" size="sm" className="flex items-center gap-1 h-8" onClick={toggleRoomPrivacy}>
                {isPrivate ? (
                  <>
                    <Lock className="h-4 w-4 text-red-400" />
                    <span className="text-xs">Private</span>
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 text-green-400" />
                    <span className="text-xs">Public</span>
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

