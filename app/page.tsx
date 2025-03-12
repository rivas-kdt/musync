import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Music2 } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Link className="flex items-center justify-center" href="/">
          <Music2 className="h-6 w-6 mr-2" />
          <span className="font-bold">MusicSync</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/login">
            Login
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/register">
            Register
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Listen to Music Together
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Create or join a room, add songs to the queue, and enjoy synchronized music with friends.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/create-room">
                  <Button>
                    Create a Room
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline">Join a Room</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-3 items-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Synchronized Playback</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Everyone in the room hears the same music at the same time, perfectly in sync.
                </p>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Chat with Friends</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Discuss the music in real-time with our built-in chat functionality.
                </p>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Collaborative Queue</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Add your favorite songs to the queue and let everyone contribute to the playlist.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">© 2025 MusicSync. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}

