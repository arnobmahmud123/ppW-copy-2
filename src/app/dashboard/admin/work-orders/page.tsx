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
  MoreVertical,
  ChevronDown,
  Image,
  Clipboard,
  ChevronLeft,
  ChevronRight,
  Settings
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
  fieldComplete?: string
  workOrderNumber?: string
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

interface ColumnFilter {
  [key: string]: string
}

interface StatusFilters {
  unassigned: boolean
  assigned: boolean
  read: boolean
  fieldComplete: boolean
  officeApproved: boolean
  sentToClient: boolean
  closed: boolean
  cancelled: boolean
}

export default function AdminWorkOrders() {
  const { data: session } = useSession()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [columnFilters, setColumnFilters] = useState<ColumnFilter>({})
  const [statusFilters, setStatusFilters] = useState<StatusFilters>({
    unassigned: true,
    assigned: true,
    read: true,
    fieldComplete: true,
    officeApproved: true,
    sentToClient: false,
    closed: false,
    cancelled: false
  })
  const [showImportModal, setShowImportModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(200)
  const [showFilterPanel, setShowFilterPanel] = useState(false)

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
      case "UNASSIGNED":
        return "bg-gray-100 text-gray-800"
      case "ASSIGNED":
        return "bg-blue-100 text-blue-800"
      case "READ":
        return "bg-indigo-100 text-indigo-800"
      case "FIELD_COMPLETE":
        return "bg-yellow-100 text-yellow-800"
      case "OFFICE_APPROVED":
        return "bg-purple-100 text-purple-800"
      case "SENT_TO_CLIENT":
        return "bg-orange-100 text-orange-800"
      case "CLOSED":
        return "bg-green-100 text-green-800"
      case "CANCELLED":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "UNASSIGNED":
        return AlertCircle
      case "ASSIGNED":
        return User
      case "READ":
        return Eye
      case "FIELD_COMPLETE":
        return CheckCircle
      case "OFFICE_APPROVED":
        return CheckCircle
      case "SENT_TO_CLIENT":
        return Send
      case "CLOSED":
        return CheckCircle
      case "CANCELLED":
        return X
      default:
        return AlertCircle
    }
  }

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case "UNASSIGNED":
        return "Unassigned"
      case "ASSIGNED":
        return "Assigned"
      case "READ":
        return "Read"
      case "FIELD_COMPLETE":
        return "Field Complete"
      case "OFFICE_APPROVED":
        return "Office Approved"
      case "SENT_TO_CLIENT":
        return "Sent to Client"
      case "CLOSED":
        return "Closed"
      case "CANCELLED":
        return "Cancelled"
      default:
        return status.replace("_", " ")
    }
  }

  const updateColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }))
  }

  const updateStatusFilter = (status: keyof StatusFilters, checked: boolean) => {
    setStatusFilters(prev => ({
      ...prev,
      [status]: checked
    }))
  }

  const runFilter = () => {
    // This would typically trigger a server-side filter
    console.log("Running filter with:", { columnFilters, statusFilters })
  }

  const resetFilter = () => {
    setColumnFilters({})
    setStatusFilters({
      unassigned: true,
      assigned: true,
      read: true,
      fieldComplete: true,
      officeApproved: true,
      sentToClient: false,
      closed: false,
      cancelled: false
    })
  }

  const copyWorkOrderInfo = (order: WorkOrder) => {
    const workOrderInfo = `Work Order: ${order.workOrderNumber || order.id}
Title: ${order.title}
Address: ${order.addressLine1}, ${order.city}, ${order.state} ${order.postalCode}
Client: ${order.client.name}
Contractor: ${order.assignedContractor?.name || 'Unassigned'}
Status: ${getStatusDisplayName(order.status)}
Due Date: ${new Date(order.dueDate).toLocaleDateString()}
Field Complete: ${order.fieldComplete ? new Date(order.fieldComplete).toLocaleDateString() : 'N/A'}`

    navigator.clipboard.writeText(workOrderInfo).then(() => {
      // You could add a toast notification here
      console.log('Work order info copied to clipboard')
    }).catch(err => {
      console.error('Failed to copy work order info:', err)
    })
  }

  const filteredWorkOrders = (workOrders || []).filter(order => {
    // Status filtering
    const statusDisplayName = getStatusDisplayName(order.status).toLowerCase()
    const statusMatches = 
      (statusDisplayName === "unassigned" && statusFilters.unassigned) ||
      (statusDisplayName === "assigned" && statusFilters.assigned) ||
      (statusDisplayName === "read" && statusFilters.read) ||
      (statusDisplayName === "field complete" && statusFilters.fieldComplete) ||
      (statusDisplayName === "office approved" && statusFilters.officeApproved) ||
      (statusDisplayName === "sent to client" && statusFilters.sentToClient) ||
      (statusDisplayName === "closed" && statusFilters.closed) ||
      (statusDisplayName === "cancelled" && statusFilters.cancelled)

    // Column filtering
    const columnMatches = Object.entries(columnFilters).every(([column, filterValue]) => {
      if (!filterValue) return true
      
      switch (column) {
        case "workOrderNumber":
          return order.workOrderNumber?.toLowerCase().includes(filterValue.toLowerCase()) || 
                 order.id.toLowerCase().includes(filterValue.toLowerCase())
        case "address":
          return order.addressLine1.toLowerCase().includes(filterValue.toLowerCase())
        case "state":
          return order.state.toLowerCase().includes(filterValue.toLowerCase())
        case "city":
          return order.city.toLowerCase().includes(filterValue.toLowerCase())
        case "client":
          return order.client.name.toLowerCase().includes(filterValue.toLowerCase())
        case "contractor":
          return order.assignedContractor?.name.toLowerCase().includes(filterValue.toLowerCase()) || false
        case "dueDate":
          return new Date(order.dueDate).toLocaleDateString().includes(filterValue)
        case "fieldComplete":
          return order.fieldComplete ? new Date(order.fieldComplete).toLocaleDateString().includes(filterValue) : false
        default:
          return true
      }
    })

    return statusMatches && columnMatches
  })

  // Pagination
  const totalPages = Math.ceil(filteredWorkOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedWorkOrders = filteredWorkOrders.slice(startIndex, endIndex)

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-800 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">View Work Order</h1>
          <a href="#" className="text-blue-300 hover:text-blue-200">Need Help?</a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="px-6">
          <nav className="flex space-x-8">
            <button className="py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium">
              All Work Order
            </button>
            <button className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700">
              WO Completion Tracker
            </button>
            <button className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700">
              New Contractor Tracker
            </button>
          </nav>
        </div>
      </div>

      {/* Action and Filter Panel */}
      <div className="bg-gray-100 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button className="text-sm text-gray-600 hover:text-gray-800">Action</button>
            <button className="text-sm text-gray-600 hover:text-gray-800">Create Filters</button>
            <button className="text-sm text-gray-600 hover:text-gray-800">Load Filters</button>
            <div className="flex items-center space-x-2">
              <button className="text-sm text-gray-600 hover:text-gray-800">Columns</button>
              <span className="text-sm text-green-600">No Filter Applied...</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={runFilter}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Run Filter
            </button>
            <button
              onClick={resetFilter}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* Status Checkboxes */}
        <div className="flex items-center space-x-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={statusFilters.unassigned}
              onChange={(e) => updateStatusFilter("unassigned", e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Unassigned</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={statusFilters.assigned}
              onChange={(e) => updateStatusFilter("assigned", e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Assigned</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={statusFilters.read}
              onChange={(e) => updateStatusFilter("read", e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Read</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={statusFilters.fieldComplete}
              onChange={(e) => updateStatusFilter("fieldComplete", e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Field Complete</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={statusFilters.officeApproved}
              onChange={(e) => updateStatusFilter("officeApproved", e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Office Approved</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={statusFilters.sentToClient}
              onChange={(e) => updateStatusFilter("sentToClient", e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Sent to Client</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={statusFilters.closed}
              onChange={(e) => updateStatusFilter("closed", e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Closed</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={statusFilters.cancelled}
              onChange={(e) => updateStatusFilter("cancelled", e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Cancelled</span>
          </label>
        </div>
      </div>

      {/* Data Table with Column Filters */}
      <div className="bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            {/* Column Headers with Filters */}
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IPL #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Order #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Photos
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  History
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  City
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Field Comp...
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contractor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  History
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
              </tr>
            </thead>
            
            {/* Filter Row */}
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <Eye className="h-4 w-4 text-gray-400" title="View Work Order Details" />
                    <Clipboard className="h-4 w-4 text-gray-400" title="Copy Work Order Info" />
                  </div>
                </th>
                <th className="px-4 py-2">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-1" />
                    <input
                      type="text"
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Filter..."
                    />
                  </div>
                </th>
                <th className="px-4 py-2">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-1" />
                    <input
                      type="text"
                      value={columnFilters.workOrderNumber || ""}
                      onChange={(e) => updateColumnFilter("workOrderNumber", e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="8337511"
                    />
                  </div>
                </th>
                <th className="px-4 py-2">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-1" />
                    <input
                      type="text"
                      value={columnFilters.address || ""}
                      onChange={(e) => updateColumnFilter("address", e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Filter..."
                    />
                  </div>
                </th>
                <th className="px-4 py-2">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-1" />
                    <input
                      type="text"
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Filter..."
                    />
                  </div>
                </th>
                <th className="px-4 py-2">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-1" />
                    <input
                      type="text"
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Filter..."
                    />
                  </div>
                </th>
                <th className="px-4 py-2">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-1" />
                    <input
                      type="text"
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Filter..."
                    />
                  </div>
                </th>
                <th className="px-4 py-2">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-1" />
                    <input
                      type="text"
                      value={columnFilters.state || ""}
                      onChange={(e) => updateColumnFilter("state", e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Filter..."
                    />
                  </div>
                </th>
                <th className="px-4 py-2">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-1" />
                    <input
                      type="text"
                      value={columnFilters.city || ""}
                      onChange={(e) => updateColumnFilter("city", e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Filter..."
                    />
                  </div>
                </th>
                <th className="px-4 py-2">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-1" />
                    <Calendar className="h-4 w-4 text-gray-400 ml-1" />
                    <input
                      type="text"
                      value={columnFilters.fieldComplete || ""}
                      onChange={(e) => updateColumnFilter("fieldComplete", e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Yont..."
                    />
                  </div>
                </th>
                <th className="px-4 py-2">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-1" />
                    <input
                      type="text"
                      value={columnFilters.client || ""}
                      onChange={(e) => updateColumnFilter("client", e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Filter..."
                    />
                  </div>
                </th>
                <th className="px-4 py-2">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-1" />
                    <input
                      type="text"
                      value={columnFilters.contractor || ""}
                      onChange={(e) => updateColumnFilter("contractor", e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Filter..."
                    />
                  </div>
                </th>
                <th className="px-4 py-2">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-1" />
                    <Calendar className="h-4 w-4 text-gray-400 ml-1" />
                    <input
                      type="text"
                      value={columnFilters.dueDate || ""}
                      onChange={(e) => updateColumnFilter("dueDate", e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Yont..."
                    />
                  </div>
                </th>
                <th className="px-4 py-2">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-1" />
                    <input
                      type="text"
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Filter..."
                    />
                  </div>
                </th>
                <th className="px-4 py-2">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 text-gray-400 mr-1" />
                    <input
                      type="text"
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Filter..."
                    />
                  </div>
                </th>
              </tr>
            </thead>
            
            {/* Data Rows */}
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedWorkOrders.map((order) => {
                const StatusIcon = getStatusIcon(order.status)
                const statusDisplayName = getStatusDisplayName(order.status)
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <Link
                          href={`/dashboard/admin/work-orders/${order.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                          title="View Work Order Details"
                        >
                          <Eye className="h-4 w-4 cursor-pointer" />
                        </Link>
                        <button
                          onClick={() => copyWorkOrderInfo(order)}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                          title="Copy Work Order Info"
                        >
                          <Clipboard className="h-4 w-4 cursor-pointer" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {order.id.slice(-7)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {order.workOrderNumber || order.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                        {order.addressLine1}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Image className="h-4 w-4 text-gray-400 mr-1" />
                        {order._count.files}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-1" />
                        {order._count.messages}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {statusDisplayName}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {order.state}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {order.city}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {order.fieldComplete ? new Date(order.fieldComplete).toLocaleDateString() : ""}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {order.client.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {order.assignedContractor ? (
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {order.assignedContractor.name}
                          </span>
                        </div>
                      ) : (
                        "Unassigned"
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                        {new Date(order.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-1" />
                        {order._count.messages}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {order.state}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex items-center">
            <span className="text-sm text-gray-700">
              Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
              <span className="font-medium">{Math.min(endIndex, filteredWorkOrders.length)}</span> of{" "}
              <span className="font-medium">{filteredWorkOrders.length}</span> results
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-blue-50 text-sm font-medium text-blue-600">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="ml-4 px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={50}>50 items per page</option>
              <option value={100}>100 items per page</option>
              <option value={200}>200 items per page</option>
            </select>
          </div>
        </div>
        
        {filteredWorkOrders.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No work orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filter criteria or create a new work order.
            </p>
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
