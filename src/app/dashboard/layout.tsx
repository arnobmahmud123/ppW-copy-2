"use client"

import { useSession } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import DashboardNav from "@/components/DashboardNav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [messagesNavVisible, setMessagesNavVisible] = useState(true)

  const isMessagesRoute = pathname === "/messages" || pathname.endsWith("/messages")

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (!session) {
      router.push("/auth/signin")
      return
    }

    // Redirect to role-specific dashboard
    const role = session.user.role
    const currentPath = window.location.pathname

    if (currentPath === "/dashboard") {
      if (role === "CLIENT") {
        router.push("/dashboard/client")
      } else if (role === "CONTRACTOR") {
        router.push("/dashboard/contractor")
      } else if (role === "ADMIN") {
        router.push("/dashboard/admin")
      } else if (role === "COORDINATOR") {
        router.push("/dashboard/coordinator")
      } else if (role === "PROCESSOR") {
        router.push("/dashboard/processor")
      }
    }
  }, [session, status, router])

  useEffect(() => {
    if (!isMessagesRoute) {
      setMessagesNavVisible(true)
      return
    }

    try {
      const saved = window.localStorage.getItem("messages:top-nav-visible")
      setMessagesNavVisible(saved !== "false")
    } catch {
      setMessagesNavVisible(true)
    }

    const handleVisibilityChange = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>
      setMessagesNavVisible(customEvent.detail !== false)
    }

    window.addEventListener("messages-nav-visibility", handleVisibilityChange as EventListener)
    return () => window.removeEventListener("messages-nav-visibility", handleVisibilityChange as EventListener)
  }, [isMessagesRoute])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="app-panel rounded-[32px] px-10 py-10">
          <div className="h-16 w-16 animate-spin rounded-full border-2 border-[rgba(194,204,234,0.88)] border-t-[#8a63ff]"></div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-transparent text-[var(--foreground)]">
      {messagesNavVisible ? <DashboardNav /> : null}
      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[34px] border border-[rgba(188,198,228,0.82)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(245,248,255,0.94)_100%)] p-3 shadow-[0_26px_80px_rgba(145,160,204,0.18)] sm:p-4">
          {children}
        </div>
      </main>
    </div>
  )
}
