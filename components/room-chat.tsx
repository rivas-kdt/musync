"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send } from "lucide-react"
import { EmojiPicker } from "@/components/emoji-picker"
import { format } from "date-fns"

interface Message {
  id: string
  text: string
  userId: string
  username: string
  timestamp: number
  isAnonymous?: boolean
  isSystem?: boolean
}

interface RoomChatProps {
  messages: Message[]
  onSendMessage: (message: string) => Promise<void>
  onEmojiSelect: (emoji: string) => void
}

export function RoomChat({ messages, onSendMessage, onEmojiSelect }: RoomChatProps) {
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    await onSendMessage(newMessage)
    setNewMessage("")
  }

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

  const handleEmojiSelectInternal = (emoji: string) => {
    setNewMessage((prev) => prev + emoji)
    onEmojiSelect(emoji)
    // Focus the input after adding emoji
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat messages */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-[calc(100vh-12rem)] px-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <p className="text-center py-8 text-gray-400">No messages yet. Start the conversation!</p>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <div key={message.id} className="flex items-start gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={message.isAnonymous ? "bg-yellow-800" : ""}>
                      {message.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{message.username}</span>
                      {message.isAnonymous && (
                        <span className="text-xs bg-yellow-800 text-yellow-300 px-1.5 py-0.5 rounded-full">Guest</span>
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
        <form onSubmit={handleSendMessage}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                placeholder="Type a message... (Type !skip to vote skip)"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="bg-white/5 border-white/10 pr-10"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <EmojiPicker onEmojiSelect={handleEmojiSelectInternal} />
              </div>
            </div>
            <Button type="submit" size="icon" variant="ghost">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

