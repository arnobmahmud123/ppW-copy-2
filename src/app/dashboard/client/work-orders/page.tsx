"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { 
  FileText, 
  Search,
  Filter,
  Plus,
  Eye,
  MessageSquare,
  Camera,
  Download,
  MapPin,
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreVertical
} from "lucide-react"

interface WorkOrder {
  id: string
  title: string
  status: string
  serviceType: string
  addressLine1: string
  city: string
  state: string
  dueDate: string
  createdAt: string
  assignedContractor?: {
    name: string
  }
  _count: {
    messages: number
    files: number
  }
}

export default function ClientWorkOrders() {
  const { data: session } = useSession()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  useEffect(() => {
    fetchWorkOrders()
  }, [])

  const fetchWorkOrders = async () => {
    try {
      const response = await fetch("/api/work-orders")
      if (response.ok) {
        const data = await response.json()
        setWorkOrders(data.workOrders)
      }
    } catch (error) {
      console.error("Error fetching work orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800"
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800"
      case "ASSIGNED":
        return "bg-yellow-100 text-yellow-800"
      case "NEW":
        return "bg-gray-100 text-gray-800"
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

  const filteredWorkOrders = workOrders.filter(order => {
    const matchesSearch = order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.addressLine1.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "ALL" || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Work Orders
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track your property preservation work orders
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

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search work orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="NEW">New</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Work Orders List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredWorkOrders.map((order) => {
            const StatusIcon = getStatusIcon(order.status)
            return (
              <li key={order.id}>
                <div className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <StatusIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {order.title}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {order.addressLine1}, {order.city}, {order.state}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Due: {new Date(order.dueDate).toLocaleDateString()}
                          </div>
                          {order.assignedContractor && (
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-1" />
                              {order.assignedContractor.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          {order._count.messages}
                        </div>
                        <div className="flex items-center">
                          <Camera className="h-4 w-4 mr-1" />
                          {order._count.files}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/dashboard/client/work-orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-500 p-2"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/dashboard/client/work-orders/${order.id}/messages`}
                          className="text-green-600 hover:text-green-500 p-2"
                          title="Messages"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/dashboard/client/work-orders/${order.id}/photos`}
                          className="text-purple-600 hover:text-purple-500 p-2"
                          title="Photos"
                        >
                          <Camera className="h-4 w-4" />
                        </Link>
                        <button className="text-gray-400 hover:text-gray-500 p-2">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        
        {filteredWorkOrders.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No work orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== "ALL" 
                ? "Try adjusting your search or filter criteria."
                : "Get started by creating a new work order."
              }
            </p>
            {!searchTerm && statusFilter === "ALL" && (
              <div className="mt-6">
                <Link
                  href="/work-orders/submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Work Order
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
