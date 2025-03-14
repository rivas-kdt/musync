import type React from "react"
import "@/styles/globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { FirebaseProvider } from "@/lib/firebase/firebase-provider"
import { ThemeProvider } from "@/components/theme-provider"
import './globals.css'
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Create Next App",
  description: "A collaborative music listening app where users can listen to YouTube music together in sync"
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <FirebaseProvider>{children}</FirebaseProvider>
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}