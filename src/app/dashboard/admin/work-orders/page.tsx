"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { 
  FileText, 
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
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
  postalCode: string
  dueDate: string
  createdAt: string
  client: {
    name: string
    company?: string
  }
  assignedContractor?: {
    name: string
    company?: string
  }
  _count: {
    messages: number
    files: number
  }
}

export default function AdminWorkOrders() {
  const { data: session } = useSession()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    status: "ALL",
    serviceType: "ALL",
    state: "ALL",
    contractor: "ALL"
  })
  const [showImportModal, setShowImportModal] = useState(false)

  useEffect(() => {
    fetchWorkOrders()
  }, [])

  const fetchWorkOrders = async () => {
    try {
      const response = await fetch("/api/work-orders")
      if (response.ok) {
        const data = await response.json()
        setWorkOrders(data || [])
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

  const filteredWorkOrders = (workOrders || []).filter(order => {
    const matchesSearch = 
      order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.addressLine1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.postalCode.includes(searchTerm) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.assignedContractor?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    
    const matchesFilters = 
      (filters.status === "ALL" || order.status === filters.status) &&
      (filters.serviceType === "ALL" || order.serviceType === filters.serviceType) &&
      (filters.state === "ALL" || order.state === filters.state) &&
      (filters.contractor === "ALL" || order.assignedContractor?.name === filters.contractor)
    
    return matchesSearch && matchesFilters
  })

  const handleExport = () => {
    const csvContent = [
      ["Work Order ID", "Title", "Status", "Service Type", "Address", "City", "State", "ZIP", "Client", "Contractor", "Due Date", "Created"],
      ...filteredWorkOrders.map(order => [
        order.id,
        order.title,
        order.status,
        order.serviceType,
        order.addressLine1,
        order.city,
        order.state,
        order.postalCode,
        order.client.name,
        order.assignedContractor?.name || "Unassigned",
        new Date(order.dueDate).toLocaleDateString(),
        new Date(order.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `work-orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

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
            All Work Orders
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage and oversee all property preservation work orders
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <Link
            href="/work-orders/submit"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Work Order
          </Link>
        </div>
      </div>

      {/* Advanced Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Search & Filters</h3>
        
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by work order ID, title, address, city, ZIP, client, or contractor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="NEW">New</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="QC">Quality Control</option>
              <option value="BILLING">Billing</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
            <select
              value={filters.serviceType}
              onChange={(e) => setFilters(prev => ({ ...prev, serviceType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Services</option>
              <option value="GRASS_CUT">Grass Cutting</option>
              <option value="DEBRIS_REMOVAL">Debris Removal</option>
              <option value="WINTERIZATION">Winterization</option>
              <option value="BOARD_UP">Board Up</option>
              <option value="INSPECTION">Inspection</option>
              <option value="MOLD_REMEDIATION">Mold Remediation</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <select
              value={filters.state}
              onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All States</option>
              <option value="MO">Missouri</option>
              <option value="AR">Arkansas</option>
              <option value="AK">Alaska</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contractor</label>
            <select
              value={filters.contractor}
              onChange={(e) => setFilters(prev => ({ ...prev, contractor: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Contractors</option>
              <option value="Unassigned">Unassigned</option>
              {/* Contractors would be populated from API */}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredWorkOrders.length} of {workOrders?.length || 0} work orders
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Work Orders
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contractor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredWorkOrders.map((order) => {
                const StatusIcon = getStatusIcon(order.status)
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <StatusIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.id}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.serviceType.replace("_", " ")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.addressLine1}</div>
                      <div className="text-sm text-gray-500">{order.city}, {order.state} {order.postalCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.client.name}</div>
                      {order.client.company && (
                        <div className="text-sm text-gray-500">{order.client.company}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.assignedContractor?.name || "Unassigned"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(order.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/dashboard/admin/work-orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-500"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          className="text-green-600 hover:text-green-500"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {filteredWorkOrders.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No work orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || Object.values(filters).some(f => f !== "ALL")
                ? "Try adjusting your search or filter criteria."
                : "Get started by creating a new work order."
              }
            </p>
            {!searchTerm && Object.values(filters).every(f => f === "ALL") && (
              <div className="mt-6">
                <Link
                  href="/work-orders/submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Work Order
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Import Work Orders</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Upload a CSV file with work order data. Download the template for the correct format.
                </p>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
