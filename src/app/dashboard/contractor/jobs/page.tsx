"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { 
  FileText, 
  Search,
  Filter,
  MapPin,
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Camera,
  MessageSquare,
  Eye,
  Play,
  Pause,
  MoreVertical
} from "lucide-react"

interface Job {
  id: string
  title: string
  status: string
  serviceType: string
  addressLine1: string
  city: string
  state: string
  dueDate: string
  createdAt: string
  client: {
    name: string
    company?: string
  }
  _count: {
    messages: number
    files: number
  }
}

export default function ContractorJobs() {
  const { data: session } = useSession()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/work-orders")
      if (response.ok) {
        const data = await response.json()
        // The API returns work orders directly, not wrapped in a workOrders property
        setJobs(data || [])
      }
    } catch (error) {
      console.error("Error fetching jobs:", error)
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
        return Play
      case "ASSIGNED":
        return Clock
      default:
        return AlertCircle
    }
  }

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/work-orders/${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Update local state
        setJobs(prev => 
          prev.map(job => 
            job.id === jobId ? { ...job, status: newStatus } : job
          )
        )
      }
    } catch (error) {
      console.error("Error updating job status:", error)
    }
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.addressLine1.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.client.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "ALL" || job.status === statusFilter
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
            My Jobs
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your assigned property preservation jobs
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

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs..."
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
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredJobs.map((job) => {
            const StatusIcon = getStatusIcon(job.status)
            return (
              <li key={job.id}>
                <div className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <StatusIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {job.title}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                            {job.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {job.addressLine1}, {job.city}, {job.state}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Due: {new Date(job.dueDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {job.client.name}
                            {job.client.company && ` (${job.client.company})`}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          {job._count.messages}
                        </div>
                        <div className="flex items-center">
                          <Camera className="h-4 w-4 mr-1" />
                          {job._count.files}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Status Update Buttons */}
                        {job.status === "ASSIGNED" && (
                          <button
                            onClick={() => updateJobStatus(job.id, "IN_PROGRESS")}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </button>
                        )}
                        {job.status === "IN_PROGRESS" && (
                          <button
                            onClick={() => updateJobStatus(job.id, "COMPLETED")}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Complete
                          </button>
                        )}
                        
                        <Link
                          href={`/dashboard/contractor/work-orders/${job.id}`}
                          className="text-blue-600 hover:text-blue-500 p-2"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/dashboard/contractor/work-orders/${job.id}?tab=messages`}
                          className="text-green-600 hover:text-green-500 p-2"
                          title="Messages"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/dashboard/contractor/upload?workOrderId=${job.id}`}
                          className="text-purple-600 hover:text-purple-500 p-2"
                          title="Upload Photos"
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
        
        {filteredJobs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== "ALL" 
                ? "Try adjusting your search or filter criteria."
                : "You don't have any assigned jobs yet."
              }
            </p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Assigned</p>
              <p className="text-lg font-semibold text-gray-900">
                {jobs.filter(job => job.status === "ASSIGNED").length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Play className="h-6 w-6 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-lg font-semibold text-gray-900">
                {jobs.filter(job => job.status === "IN_PROGRESS").length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-lg font-semibold text-gray-900">
                {jobs.filter(job => job.status === "COMPLETED").length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Camera className="h-6 w-6 text-purple-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Photos</p>
              <p className="text-lg font-semibold text-gray-900">
                {jobs.reduce((total, job) => total + job._count.files, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
