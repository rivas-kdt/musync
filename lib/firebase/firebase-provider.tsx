"use client"

import { type ReactNode, createContext, useContext, useEffect, useState } from "react"
import { type User, onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase"

interface FirebaseContextType {
  user: User | null
  loading: boolean
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  loading: true,
})

export const useFirebase = () => useContext(FirebaseContext)

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return <FirebaseContext.Provider value={{ user, loading }}>{children}</FirebaseContext.Provider>
}

