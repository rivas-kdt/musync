import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyASjE_BjBWRhYX3EIVMZuhCYnB9SxsJSL8",
  authDomain: "music-jam-a7eab.firebaseapp.com",
  databaseURL: "https://music-jam-a7eab-default-rtdb.firebaseio.com",
  projectId: "music-jam-a7eab",
  storageBucket: "music-jam-a7eab.firebasestorage.app",
  messagingSenderId: "207179864700",
  appId: "1:207179864700:web:9c3239681c9dddb70c47f9",
}

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getDatabase(app)

export { app, auth, db }

