"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { 
  FileText, 
  Users, 
  DollarSign, 
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react"

export default function AdminDashboard() {
  const { data: session } = useSession()

  // Mock data - in real app, this would come from API
  const stats = {
    totalWorkOrders: 45,
    pendingAssignments: 8,
    activeContractors: 12,
    monthlyRevenue: 15750,
    completedThisWeek: 23,
    overdueJobs: 3
  }

  const recentActivity = [
    {
      id: 1,
      type: "work_order_completed",
      message: "Work Order WO-001 completed by Green Lawn Services",
      timestamp: "2 hours ago",
      status: "success"
    },
    {
      id: 2,
      type: "new_work_order",
      message: "New work order submitted by ABC Property Management",
      timestamp: "4 hours ago",
      status: "info"
    },
    {
      id: 3,
      type: "contractor_assigned",
      message: "Contractor Clean Up Crew assigned to WO-002",
      timestamp: "6 hours ago",
      status: "info"
    },
    {
      id: 4,
      type: "payment_received",
      message: "Payment received for Invoice #INV-001",
      timestamp: "1 day ago",
      status: "success"
    }
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "work_order_completed":
        return CheckCircle
      case "new_work_order":
        return FileText
      case "contractor_assigned":
        return Users
      case "payment_received":
        return DollarSign
      default:
        return AlertCircle
    }
  }

  const getActivityColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600"
      case "info":
        return "text-blue-600"
      case "warning":
        return "text-yellow-600"
      case "error":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Admin Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Overview of all system activity and performance metrics
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            href="/dashboard/admin/work-orders"
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FileText className="h-4 w-4 mr-2" />
            Manage Work Orders
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Work Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalWorkOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Assignment
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.pendingAssignments}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Contractors
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.activeContractors}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Monthly Revenue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${stats.monthlyRevenue.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completed This Week
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.completedThisWeek}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Overdue Jobs
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.overdueJobs}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Activity
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Latest system events and updates
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {recentActivity.map((activity) => {
            const ActivityIcon = getActivityIcon(activity.type)
            return (
              <li key={activity.id}>
                <div className="px-4 py-4 flex items-center">
                  <div className="flex-shrink-0">
                    <ActivityIcon className={`h-6 w-6 ${getActivityColor(activity.status)}`} />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="text-sm text-gray-900">
                      {activity.message}
                    </div>
                    <div className="text-sm text-gray-500">
                      {activity.timestamp}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/admin/work-orders"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-6 w-6 text-blue-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Manage Work Orders</span>
          </Link>
          <Link
            href="/dashboard/admin/users"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-6 w-6 text-green-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Manage Users</span>
          </Link>
          <Link
            href="/dashboard/admin/billing"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <DollarSign className="h-6 w-6 text-purple-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Billing & Invoices</span>
          </Link>
          <Link
            href="/dashboard/admin/messages"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="h-6 w-6 text-orange-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">System Messages</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
