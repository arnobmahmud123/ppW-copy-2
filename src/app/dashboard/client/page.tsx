"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { 
  FileText, 
  DollarSign, 
  MessageSquare, 
  Plus,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react"

export default function ClientDashboard() {
  const { data: session } = useSession()

  // Mock data - in real app, this would come from API
  const stats = {
    totalWorkOrders: 12,
    pendingWorkOrders: 3,
    completedWorkOrders: 8,
    totalInvoices: 5,
    unpaidInvoices: 1
  }

  const recentWorkOrders = [
    {
      id: "WO-001",
      title: "Grass Cutting - 123 Main St",
      status: "COMPLETED",
      date: "2024-01-15",
      contractor: "Green Lawn Services"
    },
    {
      id: "WO-002", 
      title: "Debris Removal - 456 Oak Ave",
      status: "IN_PROGRESS",
      date: "2024-01-16",
      contractor: "Clean Up Crew"
    },
    {
      id: "WO-003",
      title: "Winterization - 789 Pine St", 
      status: "ASSIGNED",
      date: "2024-01-17",
      contractor: "Winter Pro Services"
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800"
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800"
      case "ASSIGNED":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return CheckCircle
      case "IN_PROGRESS":
        return Clock
      default:
        return AlertCircle
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Welcome back, {session?.user.name}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your property preservation work orders and track progress
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            href="/work-orders/submit"
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Work Order
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                    Pending Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.pendingWorkOrders}
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
                    Completed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.completedWorkOrders}
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
                <DollarSign className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Unpaid Invoices
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.unpaidInvoices}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Work Orders */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Work Orders
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Your latest property preservation requests
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {recentWorkOrders.map((order) => {
            const StatusIcon = getStatusIcon(order.status)
            return (
              <li key={order.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <StatusIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {order.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        Work Order #{order.id} • {order.date}
                      </div>
                      <div className="text-sm text-gray-500">
                        Contractor: {order.contractor}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status.replace("_", " ")}
                    </span>
                    <Link
                      href={`/dashboard/client/work-orders/${order.id}`}
                      className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
          <Link
            href="/dashboard/client/work-orders"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View all work orders
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/work-orders/submit"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-6 w-6 text-blue-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Submit Work Order</span>
          </Link>
          <Link
            href="/dashboard/client/invoices"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <DollarSign className="h-6 w-6 text-green-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">View Invoices</span>
          </Link>
          <Link
            href="/dashboard/client/messages"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="h-6 w-6 text-purple-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Messages</span>
          </Link>
          <Link
            href="/dashboard/client/work-orders"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-6 w-6 text-gray-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">All Work Orders</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
