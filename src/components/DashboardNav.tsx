"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Home, 
  FileText, 
  Users, 
  DollarSign, 
  MessageSquare, 
  Settings, 
  LogOut,
  Menu,
  X
} from "lucide-react"
import { useState } from "react"

export default function DashboardNav() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const role = session?.user.role

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
      ]
    } else if (role === "CONTRACTOR") {
      return [
        ...baseItems,
        { name: "My Jobs", href: "/dashboard/contractor/jobs", icon: FileText },
        { name: "Upload Photos", href: "/dashboard/contractor/upload", icon: FileText },
        { name: "Messages", href: "/dashboard/contractor/messages", icon: MessageSquare },
        { name: "Earnings", href: "/dashboard/contractor/earnings", icon: DollarSign },
      ]
    } else if (role === "ADMIN") {
      return [
        ...baseItems,
        { name: "All Work Orders", href: "/dashboard/admin/work-orders", icon: FileText },
        { name: "Contractors", href: "/dashboard/admin/contractors", icon: Users },
        { name: "Billing", href: "/dashboard/admin/billing", icon: DollarSign },
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
      ]
    } else if (role === "PROCESSOR") {
      return [
        ...baseItems,
        { name: "My Work Orders", href: "/dashboard/processor/work-orders", icon: FileText },
        { name: "Messages", href: "/dashboard/processor/messages", icon: MessageSquare },
        { name: "Reports", href: "/dashboard/processor/reports", icon: FileText },
      ]
    }

    return baseItems
  }

  const navItems = getNavItems()

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                PropertyPreserve Pro
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? "border-blue-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:block">
              <span className="text-sm text-gray-700">
                Welcome, {session?.user.name}
              </span>
              <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {role}
              </span>
            </div>
            
            <button
              onClick={handleSignOut}
              className="text-gray-500 hover:text-gray-700 p-2"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700"
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

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </div>
                </Link>
              )
            })}
            <div className="px-3 py-2 border-t">
              <div className="text-sm text-gray-700">
                {session?.user.name} ({role})
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
