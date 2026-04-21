"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Bell,
  Brain,
  Building2,
  Home, 
  FileText, 
  Users, 
  DollarSign, 
  MessageSquare, 
  Boxes,
  GraduationCap,
  LogOut,
  Menu,
  X
} from "lucide-react"
import { useEffect, useState } from "react"

type NotificationItem = {
  id: string
  title: string
  body: string
  link?: string | null
  readAt?: string | null
  createdAt: string
  workOrder?: {
    id: string
    title: string
    workOrderNumber?: string | null
  } | null
}

export default function DashboardNav() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const role = session?.user.role
  const sessionUserId = session?.user?.id

  useEffect(() => {
    if (!sessionUserId) return
    void fetchNotifications()
  }, [sessionUserId])

  useEffect(() => {
    if (!sessionUserId) return

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchNotifications()
      }
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [sessionUserId])

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications?ts=${Date.now()}`, { cache: "no-store" })
      if (!response.ok) {
        return
      }

      const data = await response.json()
      setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
      setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0)
    } catch {
      // Ignore transient notification fetch failures in the nav.
    }
  }

  const markNotificationRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      })
      await fetchNotifications()
    } catch {
      // Ignore transient notification update failures in the nav.
    }
  }

  const markAllNotificationsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ markAll: true }),
      })
      await fetchNotifications()
    } catch {
      // Ignore transient notification update failures in the nav.
    }
  }

  const getNavItems = () => {
    const baseItems = [
      { name: "Dashboard", href: `/dashboard/${role?.toLowerCase()}`, icon: Home },
    ]

    if (role === "CLIENT") {
      return [
        ...baseItems,
        { name: "Work Orders", href: "/dashboard/client/work-orders", icon: FileText },
        { name: "Invoices", href: "/dashboard/client/invoices", icon: DollarSign },
        { name: "Messages", href: "/dashboard/client/messages", icon: MessageSquare },
        { name: "Reports", href: "/dashboard/client/reports", icon: FileText },
        { name: "Support", href: "/dashboard/client/support", icon: MessageSquare },
      ]
    } else if (role === "CONTRACTOR") {
      return [
        ...baseItems,
        { name: "My Jobs", href: "/dashboard/contractor/jobs", icon: FileText },
        { name: "Upload Photos", href: "/dashboard/contractor/upload", icon: FileText },
        { name: "Messages", href: "/dashboard/contractor/messages", icon: MessageSquare },
        { name: "Earnings", href: "/dashboard/contractor/earnings", icon: DollarSign },
        { name: "Support", href: "/dashboard/contractor/support", icon: MessageSquare },
      ]
    } else if (role === "ADMIN") {
      return [
        ...baseItems,
        { name: "All Work Orders", href: "/dashboard/admin/work-orders", icon: FileText },
        { name: "Properties", href: "/dashboard/admin/properties", icon: Building2 },
        { name: "Assets", href: "/dashboard/admin/assets", icon: Boxes },
        { name: "Coordinators", href: "/dashboard/admin/coordinators", icon: Users },
        { name: "Users", href: "/dashboard/admin/users", icon: Users },
        { name: "Contractors", href: "/dashboard/admin/contractors", icon: Users },
        { name: "Billing", href: "/dashboard/admin/billing", icon: DollarSign },
        { name: "Operations AI", href: "/dashboard/admin/operations-ai", icon: Brain },
        { name: "Training", href: "/dashboard/admin/training", icon: GraduationCap },
        { name: "Messages", href: "/dashboard/admin/messages", icon: MessageSquare },
        { name: "Reports", href: "/dashboard/admin/reports", icon: FileText },
        { name: "Support", href: "/dashboard/admin/support", icon: MessageSquare },
      ]
    } else if (role === "COORDINATOR") {
      return [
        ...baseItems,
        { name: "My Work Orders", href: "/dashboard/coordinator/work-orders", icon: FileText },
        { name: "Messages", href: "/dashboard/coordinator/messages", icon: MessageSquare },
        { name: "Reports", href: "/dashboard/coordinator/reports", icon: FileText },
        { name: "Support", href: "/dashboard/coordinator/support", icon: MessageSquare },
      ]
    } else if (role === "PROCESSOR") {
      return [
        ...baseItems,
        { name: "My Work Orders", href: "/dashboard/processor/work-orders", icon: FileText },
        { name: "Messages", href: "/dashboard/processor/messages", icon: MessageSquare },
        { name: "Reports", href: "/dashboard/processor/reports", icon: FileText },
        { name: "Support", href: "/dashboard/processor/support", icon: MessageSquare },
      ]
    }

    return baseItems
  }

  const navItems = getNavItems()

  const getNavLabel = (name: string) => {
    if (role === "ADMIN") {
      switch (name) {
        case "All Work Orders":
          return "Orders"
        case "Properties":
          return "Props"
        case "Assets":
          return "Assets"
        case "Coordinators":
          return "Coords"
        case "Users":
          return "Users"
        case "Contractors":
          return "Vendors"
        case "Billing":
          return "Bills"
        case "Operations AI":
          return "AI Ops"
        case "Training":
          return "Learn"
        case "Messages":
          return "Chat"
        case "Reports":
          return "Reports"
        case "Support":
          return "Support"
        default:
          return name
      }
    }

    return name
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  return (
    <nav className="app-animate-soft sticky top-0 z-[140] isolate border-b border-[rgba(224,211,255,0.88)] bg-[radial-gradient(circle_at_top_left,rgba(255,190,232,0.22),transparent_24%),radial-gradient(circle_at_top_right,rgba(176,197,255,0.18),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,244,255,0.96)_52%,rgba(241,246,255,0.96)_100%)] text-[var(--foreground)] shadow-[0_18px_48px_rgba(189,181,236,0.16)] backdrop-blur-xl">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[70px] items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="shrink-0">
              <Link href="/" className="text-[1.42rem] font-semibold tracking-tight text-[#24324a] lg:text-[1.56rem]">
                ProPres
              </Link>
            </div>

            <div className="hidden min-w-0 flex-1 md:ml-1 md:flex md:items-center md:gap-0.5 md:overflow-x-auto md:whitespace-nowrap">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`app-hover-lift inline-flex shrink-0 items-center gap-1 rounded-xl px-1.5 py-1.25 text-[11px] font-medium lg:px-1.5 ${
                      isActive
                        ? "app-glass-sheen bg-[linear-gradient(135deg,rgba(255,236,248,0.98)_0%,rgba(234,241,255,0.98)_100%)] text-[#7c3aed] shadow-[inset_0_0_0_1px_rgba(186,125,255,0.24),0_12px_24px_rgba(160,142,221,0.16)]"
                        : "text-[#6f7da1] hover:bg-[linear-gradient(135deg,rgba(255,245,251,0.96)_0%,rgba(239,245,255,0.96)_100%)] hover:text-[#24324a]"
                    }`}
                  >
                    <item.icon className={`h-3 w-3 ${isActive ? "text-[#c448f4]" : "text-[#8a96bb]"}`} />
                    {getNavLabel(item.name)}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 pl-1.5 lg:gap-2">
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                className="app-hover-lift relative flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(224,211,255,0.92)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(245,240,255,0.96)_52%,rgba(239,245,255,0.96)_100%)] text-[#657598] shadow-[0_8px_22px_rgba(189,181,236,0.14)] transition hover:text-[#7c3aed]"
                title="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 ? (
                  <span className="app-floating-accent absolute right-0.5 top-0.5 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border border-[rgba(209,198,255,0.96)] bg-[linear-gradient(135deg,#ffe7f8_0%,#ece1ff_58%,#dcebff_100%)] px-1 text-[10px] font-semibold leading-none text-[#24324a] shadow-[0_8px_18px_rgba(168,132,255,0.16)]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>

              {isNotificationsOpen ? (
                <div className="absolute right-0 z-[180] mt-3 w-[380px] overflow-hidden rounded-3xl border border-[rgba(188,198,228,0.86)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,248,255,0.98)_100%)] shadow-[0_28px_60px_rgba(145,160,204,0.22)]">
                  <div className="flex items-center justify-between border-b border-[rgba(194,204,234,0.86)] px-4 py-4">
                    <div>
                      <div className="text-sm font-semibold text-[#24324a]">Notifications</div>
                      <div className="text-xs text-[#7080a5]">{unreadCount} unread messages</div>
                    </div>
                    <button
                      onClick={() => void markAllNotificationsRead()}
                      className="text-xs font-medium text-[#8f39e8] hover:text-[#6f2ed2]"
                    >
                      Mark all read
                    </button>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-[#7080a5]">
                        No message notifications yet.
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <Link
                          key={notification.id}
                          href={
                            notification.link ||
                            `/dashboard/${role?.toLowerCase()}/messages${
                              notification.workOrder?.id ? `?workOrderId=${notification.workOrder.id}` : ""
                            }`
                          }
                          onClick={() => {
                            void markNotificationRead(notification.id)
                            setIsNotificationsOpen(false)
                          }}
                          className={`block border-b border-[rgba(194,204,234,0.82)] px-4 py-4 transition hover:bg-[#f7f8ff] ${
                            notification.readAt ? "bg-transparent" : "bg-[rgba(255,238,248,0.82)]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[#24324a]">{notification.title}</div>
                              <div className="mt-1 line-clamp-2 text-sm text-[#5f6f91]">{notification.body}</div>
                              <div className="mt-2 text-xs text-[#7c8aaf]">
                                {notification.workOrder?.workOrderNumber || notification.workOrder?.title || "Message thread"}
                              </div>
                            </div>
                            <div className="shrink-0 text-[11px] text-[#8a96bb]">
                              {new Date(notification.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="hidden lg:flex lg:max-w-[128px] lg:flex-col lg:items-end lg:text-right">
              <span className="truncate text-[12px] font-medium text-[#24324a]">
                Welcome, {session?.user.name}
              </span>
              <span className="mt-1 rounded-full border border-[rgba(224,211,255,0.92)] bg-[linear-gradient(135deg,rgba(255,244,251,0.96)_0%,rgba(241,246,255,0.96)_100%)] px-1.5 py-0.5 text-[10px] font-semibold text-[#7c3aed]">
                {role}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="rounded-full border border-[rgba(224,211,255,0.92)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(245,240,255,0.96)_52%,rgba(239,245,255,0.96)_100%)] p-1.5 text-[#657598] shadow-[0_8px_22px_rgba(189,181,236,0.14)] hover:text-[#c448f4]"
              title="Sign Out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-full border border-[rgba(224,211,255,0.92)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(245,240,255,0.96)_52%,rgba(239,245,255,0.96)_100%)] p-2 text-[#657598] shadow-[0_8px_22px_rgba(189,181,236,0.14)] hover:text-[#7c3aed] md:hidden"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 border-t border-[rgba(194,204,234,0.84)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,248,255,0.98)_100%)] px-2 pb-3 pt-2 sm:px-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block rounded-2xl px-3 py-2 text-base font-medium ${
                    isActive
                      ? "bg-[linear-gradient(135deg,rgba(255,236,248,0.98)_0%,rgba(234,241,255,0.98)_100%)] text-[#7c3aed]"
                      : "text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <item.icon className={`mr-3 h-5 w-5 ${isActive ? "text-[#c448f4]" : "text-[#8a96bb]"}`} />
                    {item.name}
                  </div>
                </Link>
              )
            })}
            <div className="border-t border-[rgba(194,204,234,0.84)] px-3 py-2">
              <div className="text-sm text-[#24324a]">
                {session?.user.name} ({role})
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
