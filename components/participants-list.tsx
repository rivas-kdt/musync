"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Participant {
  id: string
  displayName: string
  isAnonymous?: boolean
  isCreator?: boolean
  lastActive: number
}

interface ParticipantsListProps {
  participants: Participant[]
  creatorId: string
}

export function ParticipantsList({ participants, creatorId }: ParticipantsListProps) {
  // Sort participants: creator first, then by name
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.id === creatorId) return -1
    if (b.id === creatorId) return 1
    return a.displayName.localeCompare(b.displayName)
  })

  // Check if a participant is active (active in the last 5 minutes)
  const isActive = (lastActive: number) => {
    return Date.now() - lastActive < 5 * 60 * 1000
  }

  return (
    <ScrollArea className="h-[calc(100vh-10rem)]">
      <div className="space-y-2 p-1">
        {sortedParticipants.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No one else is here</p>
        ) : (
          sortedParticipants.map((participant) => (
            <div key={participant.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={participant.isAnonymous ? "bg-yellow-800" : ""}>
                    {participant.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-black ${
                    isActive(participant.lastActive) ? "bg-green-500" : "bg-gray-500"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{participant.displayName}</span>
                  {participant.id === creatorId && (
                    <span className="text-xs bg-blue-800 text-blue-300 px-1.5 py-0.5 rounded-full">Host</span>
                  )}
                  {participant.isAnonymous && (
                    <span className="text-xs bg-yellow-800 text-yellow-300 px-1.5 py-0.5 rounded-full">Guest</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{isActive(participant.lastActive) ? "Online" : "Away"}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  )
}

