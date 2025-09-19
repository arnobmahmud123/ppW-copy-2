"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import DashboardNav from "@/components/DashboardNav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

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

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
