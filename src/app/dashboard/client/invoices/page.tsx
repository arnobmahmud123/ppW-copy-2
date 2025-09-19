"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { 
  DollarSign, 
  Search,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText
} from "lucide-react"

interface Invoice {
  id: string
  workOrderId: string
  status: string
  amount: number
  dueDate: string
  createdAt: string
  paidAt?: string
  workOrder: {
    title: string
    serviceType: string
  }
}

export default function ClientInvoices() {
  const { data: session } = useSession()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      const response = await fetch("/api/client/invoices")
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices)
      }
    } catch (error) {
      console.error("Error fetching invoices:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800"
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "OVERDUE":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PAID":
        return CheckCircle
      case "PENDING":
        return Clock
      case "OVERDUE":
        return XCircle
      default:
        return FileText
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.workOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.workOrder.title.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "ALL" || invoice.status === statusFilter
    
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
            Invoices
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your property preservation invoices
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
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
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredInvoices.map((invoice) => {
            const StatusIcon = getStatusIcon(invoice.status)
            return (
              <li key={invoice.id}>
                <div className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <StatusIcon className="h-8 w-8 text-gray-400 mr-4" />
                      <div>
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            Invoice #{invoice.id}
                          </p>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          Work Order: {invoice.workOrderId} • {invoice.workOrder.title}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          Due: {new Date(invoice.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          ${invoice.amount.toLocaleString()}
                        </div>
                        {invoice.paidAt && (
                          <div className="text-sm text-gray-500">
                            Paid: {new Date(invoice.paidAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-500">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-500">
                          <Download className="h-4 w-4" />
                        </button>
                        {invoice.status === "PENDING" && (
                          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        
        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== "ALL"
                ? "Try adjusting your search or filter criteria."
                : "Invoices will appear here once work orders are completed and billed."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
