"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft,
  FileText, 
  MessageSquare, 
  Camera, 
  Download,
  Upload,
  MapPin,
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Copy,
  Printer,
  Trash2,
  Plus,
  Eye,
  Filter
} from "lucide-react"

interface WorkOrder {
  id: string
  title: string
  description: string
  status: string
  serviceType: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  dueDate: string
  createdAt: string
  specialInstructions?: string
  client: {
    name: string
    email: string
  }
  assignedContractor?: {
    name: string
    email: string
    phone: string
  }
  _count: {
    messages: number
    files: number
  }
}

export default function WorkOrderDetail() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("instructions")

  useEffect(() => {
    if (params.id) {
      fetchWorkOrder(params.id as string)
    }
  }, [params.id])

  const fetchWorkOrder = async (id: string) => {
    try {
      const response = await fetch(`/api/work-orders/${id}`)
      if (response.ok) {
        const data = await response.json()
        setWorkOrder(data)
      }
    } catch (error) {
      console.error("Error fetching work order:", error)
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

  const tabs = [
    { id: "instructions", label: "Instructions", icon: FileText },
    { id: "photos", label: `Photos (${workOrder?._count.files || 0})`, icon: Camera },
    { id: "messages", label: `Messages (${workOrder?._count.messages || 0})`, icon: MessageSquare },
    { id: "invoice", label: "Invoice", icon: FileText },
    { id: "property", label: "Property Info", icon: MapPin },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Work order not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The work order you're looking for doesn't exist or you don't have access to it.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard/client/work-orders"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work Orders
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/client/work-orders"
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Work Order #{workOrder.id}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {workOrder.title}
            </p>
          </div>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </button>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </button>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </button>
        </div>
      </div>

      {/* Status and Actions */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option value={workOrder.status}>{workOrder.status.replace("_", " ")}</option>
              </select>
            </div>
            <button className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              {workOrder.status.replace("_", " ")}
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <MapPin className="h-4 w-4 mr-2" />
              Map
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <MessageSquare className="h-4 w-4 mr-2" />
              Message
            </button>
          </div>
        </div>
      </div>

      {/* Work Order Summary */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <dt className="text-sm font-medium text-gray-500">Work Type</dt>
            <dd className="mt-1 text-sm text-gray-900">{workOrder.serviceType.replace("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Contractor</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {workOrder.assignedContractor?.name || "Not assigned"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Work Order No</dt>
            <dd className="mt-1 text-sm text-gray-900">{workOrder.id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Client</dt>
            <dd className="mt-1 text-sm text-gray-900">{workOrder.client.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Address</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {workOrder.addressLine1}
              {workOrder.addressLine2 && <br />}
              {workOrder.addressLine2}
              <br />
              {workOrder.city}, {workOrder.state} {workOrder.postalCode}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Due Date</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(workOrder.dueDate).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(workOrder.createdAt).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(workOrder.status)}`}>
                {workOrder.status.replace("_", " ")}
              </span>
            </dd>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "instructions" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Work Instructions</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-700">{workOrder.description}</p>
                </div>
              </div>
              
              {workOrder.specialInstructions && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Special Instructions</h3>
                  <div className="prose max-w-none">
                    <p className="text-gray-700">{workOrder.specialInstructions}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "photos" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Photos & Documents</h3>
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photos
                  </button>
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    <Download className="h-4 w-4 mr-2" />
                    Download All
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* Photo placeholders */}
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                    <Camera className="h-8 w-8 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "messages" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Messages</h3>
                <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Message
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Message placeholders */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">Contractor Name</span>
                      </div>
                      <span className="text-sm text-gray-500">2 hours ago</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      This is a sample message about the work order progress...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "invoice" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Invoice</h3>
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </button>
                  <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                    Pay Now
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-600">Invoice details will be displayed here once the work is completed and invoiced.</p>
              </div>
            </div>
          )}

          {activeTab === "property" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Property Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Address</h4>
                  <p className="text-sm text-gray-700">
                    {workOrder.addressLine1}
                    {workOrder.addressLine2 && <br />}
                    {workOrder.addressLine2}
                    <br />
                    {workOrder.city}, {workOrder.state} {workOrder.postalCode}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Service Type</h4>
                  <p className="text-sm text-gray-700">{workOrder.serviceType.replace("_", " ")}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
