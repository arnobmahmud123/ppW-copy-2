"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { 
  FileText, 
  Camera, 
  MessageSquare, 
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  DollarSign
} from "lucide-react"

interface WorkOrder {
  id: string
  title: string
  description: string
  serviceType: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  dueDate?: string
  status: string
  priority?: string
  client: {
    id: string
    name: string
    email: string
    phone?: string
  }
  assignedContractorId?: string
  assignedCoordinatorId?: string
  assignedProcessorId?: string
  _count: {
    messages: number
    files: number
  }
}

export default function ContractorDashboard() {
  const { data: session } = useSession()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    assignedJobs: 0,
    completedToday: 0,
    pendingUploads: 0,
    totalEarnings: 0
  })

  useEffect(() => {
    if (session?.user?.role === "CONTRACTOR") {
      fetchWorkOrders()
    }
  }, [session])

  const fetchWorkOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/work-orders")
      if (response.ok) {
        const data = await response.json()
        setWorkOrders(data)
        
        // Calculate stats
        const today = new Date().toISOString().split('T')[0]
        const completedToday = data.filter((wo: WorkOrder) => 
          wo.status === "COMPLETED" && 
          wo.dueDate && 
          wo.dueDate.split('T')[0] === today
        ).length
        
        const pendingUploads = data.filter((wo: WorkOrder) => 
          wo.status === "IN_PROGRESS" || wo.status === "ASSIGNED"
        ).length
        
        setStats({
          assignedJobs: data.length,
          completedToday,
          pendingUploads,
          totalEarnings: 0 // This would need to be calculated from invoices
        })
      } else {
        console.error("Failed to fetch work orders:", response.statusText)
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
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800"
      case "LOW":
        return "bg-green-100 text-green-800"
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
            Manage your assigned jobs and track your progress
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            href="/dashboard/contractor/upload"
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Camera className="h-4 w-4 mr-2" />
            Upload Photos
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
                    Assigned Jobs
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.assignedJobs}
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
                    Completed Today
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.completedToday}
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
                <Camera className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Uploads
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.pendingUploads}
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
                <span className="text-2xl">$</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Earnings
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${stats.totalEarnings}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Jobs */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Assigned Jobs
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Your current and upcoming work assignments
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {loading ? (
            <li className="px-4 py-4">
              <div className="text-center text-gray-500">Loading assigned jobs...</div>
            </li>
          ) : workOrders.length === 0 ? (
            <li className="px-4 py-4">
              <div className="text-center text-gray-500">No assigned jobs found</div>
            </li>
          ) : (
            workOrders.map((job) => {
              const StatusIcon = getStatusIcon(job.status)
              const messageCount = job._count?.messages || 0
              const address = `${job.addressLine1}${job.addressLine2 ? ', ' + job.addressLine2 : ''}, ${job.city}, ${job.state}`
              const dueDate = job.dueDate ? new Date(job.dueDate).toLocaleDateString() : 'No due date'
              
              return (
                <li key={job.id}>
                  <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <StatusIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {job.title}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {address}
                          </div>
                          <div className="text-sm text-gray-500">
                            Client: {job.client?.name} • Due: {dueDate}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {messageCount > 0 && (
                          <div className="flex items-center text-blue-600">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            <span className="text-xs font-medium">{messageCount}</span>
                          </div>
                        )}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(job.priority || 'MEDIUM')}`}>
                          {job.priority || 'MEDIUM'}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                          {job.status.replace("_", " ")}
                        </span>
                        <Link
                          href={`/dashboard/contractor/work-orders/${job.id}`}
                          className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })
          )}
        </ul>
        <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
          <Link
            href="/dashboard/contractor/jobs"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View all jobs
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/contractor/upload"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Camera className="h-6 w-6 text-blue-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Upload Photos</span>
          </Link>
          <Link
            href="/dashboard/contractor/jobs"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-6 w-6 text-green-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">My Jobs</span>
          </Link>
          <Link
            href="/dashboard/contractor/messages"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="h-6 w-6 text-purple-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Messages</span>
          </Link>
          <Link
            href="/dashboard/contractor/profile"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="h-6 w-6 text-gray-600 mr-3">👤</span>
            <span className="text-sm font-medium text-gray-900">Profile</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
