"use client"

import { useState, useEffect } from "react"
import { Ebook } from "@/components/ebook"
import { LoginModal } from "@/components/login-modal"

export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if user was previously authenticated in this session
    const authStatus = sessionStorage.getItem("is_authenticated")
    setIsAuthenticated(authStatus === "true")
  }, [])

  if (isAuthenticated === null) {
      return <div className="min-h-screen bg-emerald-950 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
  }

  return <Ebook />
}
