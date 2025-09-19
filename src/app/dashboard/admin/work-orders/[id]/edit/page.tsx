"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  FileText, 
  Search,
  Plus,
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
  Copy,
  Printer,
  MessageSquare,
  Camera,
  Download,
  Upload,
  DollarSign,
  Settings,
  ChevronDown,
  ChevronUp,
  X,
  Send,
  Image as ImageIcon,
  File,
  MessageCircle,
  Home,
  Phone,
  Mail,
  Star,
  Filter,
  Save,
  Check,
  Plus as PlusIcon,
  ArrowLeft
} from "lucide-react"

interface WorkOrder {
  id: string
  title: string
  description: string
  serviceType: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  dueDate: string
  status: string
  workOrderNumber: string
  coordinator: string
  processor: string
  gpsLat: number | null
  gpsLon: number | null
  lockCode: string
  lockLocation: string
  keyCode: string
  gateCode: string
  lotSize: string
  assignedDate: string | null
  startDate: string | null
  estCompletion: string | null
  fieldComplete: string | null
  client: {
    id: string
    name: string
    email: string
    phone: string
  }
  assignedContractor: {
    id: string
    name: string
    email: string
    phone: string
  } | null
  creator: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

export default function EditWorkOrder() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    serviceType: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    dueDate: "",
    specialInstructions: "",
    workOrderNumber: "",
    coordinatorId: "",
    processorId: "",
    gpsLat: "",
    gpsLon: "",
    lockCode: "",
    lockLocation: "",
    keyCode: "",
    gateCode: "",
    lotSize: "",
    startDate: "",
    estCompletion: "",
    assignedContractorId: ""
  })

  // State for dynamic user dropdowns
  const [users, setUsers] = useState<{
    coordinators: Array<{id: string, name: string, email: string}>,
    processors: Array<{id: string, name: string, email: string}>,
    contractors: Array<{id: string, name: string, email: string}>,
    clients: Array<{id: string, name: string, email: string}>
  }>({
    coordinators: [],
    processors: [],
    contractors: [],
    clients: []
  })

  useEffect(() => {
    if (session?.user?.role !== "ADMIN") {
      router.push("/dashboard")
      return
    }

    fetchWorkOrder()
    fetchUsers()
  }, [session, params.id])

  // Fetch users for dropdowns
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const allUsers = await response.json()
        
        // Filter users by role
        const coordinators = allUsers.filter((user: any) => user.role === "COORDINATOR")
        const processors = allUsers.filter((user: any) => user.role === "PROCESSOR")
        const contractors = allUsers.filter((user: any) => user.role === "CONTRACTOR")
        const clients = allUsers.filter((user: any) => user.role === "CLIENT")
        
        setUsers({
          coordinators,
          processors,
          contractors,
          clients
        })
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  useEffect(() => {
    console.log("FormData changed:", formData)
  }, [formData])

  const fetchWorkOrder = async () => {
    try {
      console.log("Fetching work order with ID:", params.id)
      const response = await fetch(`/api/work-orders/${params.id}`)
      console.log("Response status:", response.status)
      if (response.ok) {
        const data = await response.json()
        console.log("Fetched work order data:", data)
        setWorkOrder(data)
        
        // Populate form with existing data
        const formDataToSet = {
          title: data.title || "",
          description: data.description || "",
          serviceType: data.serviceType || "",
          addressLine1: data.addressLine1 || "",
          addressLine2: data.addressLine2 || "",
          city: data.city || "",
          state: data.state || "",
          postalCode: data.postalCode || "",
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : "",
          specialInstructions: "",
          workOrderNumber: data.workOrderNumber || "",
          coordinatorId: data.assignedCoordinatorId || "",
          processorId: data.assignedProcessorId || "",
          gpsLat: data.gpsLat?.toString() || "",
          gpsLon: data.gpsLon?.toString() || "",
          lockCode: data.lockCode || "",
          lockLocation: data.lockLocation || "",
          keyCode: data.keyCode || "",
          gateCode: data.gateCode || "",
          lotSize: data.lotSize || "",
          startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : "",
          estCompletion: data.estCompletion ? new Date(data.estCompletion).toISOString().split('T')[0] : "",
          assignedContractorId: data.assignedContractorId || ""
        }
        console.log("Setting form data:", formDataToSet)
        setFormData(formDataToSet)
      } else {
        console.error("Failed to fetch work order")
        setSubmitStatus("error")
      }
    } catch (error) {
      console.error("Error fetching work order:", error)
      setSubmitStatus("error")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSubmitStatus("idle")

    try {
      console.log("Updating work order with data:", formData)
      
      const response = await fetch(`/api/work-orders/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitStatus("success")
        // Redirect to work order detail page
        router.push(`/dashboard/admin/work-orders/${params.id}`)
      } else {
        const errorData = await response.json()
        console.error("Failed to update work order:", errorData)
        setSubmitStatus("error")
      }
    } catch (error) {
      console.error("Error updating work order:", error)
      setSubmitStatus("error")
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading work order...</p>
        </div>
      </div>
    )
  }

  if (!workOrder && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Work Order Not Found</h2>
          <p className="text-gray-600 mb-4">The work order you're looking for doesn't exist or you don't have permission to view it.</p>
          <Link href="/dashboard/admin/work-orders" className="text-blue-600 hover:text-blue-500">
            ← Back to Work Orders
          </Link>
        </div>
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading work order...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href={`/dashboard/admin/work-orders/${params.id}`}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                Edit Work Order: {workOrder.workOrderNumber || workOrder.title}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href={`/dashboard/admin/work-orders/${params.id}`}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Order Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type *
                </label>
                <select
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Service Type</option>
                  <option value="MOLD_REMEDIATION">Mold Remediation</option>
                  <option value="BOARD_UP">Board Up</option>
                  <option value="WINTERIZATION">Winterization</option>
                  <option value="LAWN_MAINTENANCE">Lawn Maintenance</option>
                  <option value="DEBRIS_REMOVAL">Debris Removal</option>
                  <option value="INSPECTION">Inspection</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Work Order Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Work Order Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Order Number
                </label>
                <input
                  type="text"
                  name="workOrderNumber"
                  value={formData.workOrderNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coordinator
                </label>
                <select
                  name="coordinatorId"
                  value={formData.coordinatorId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a coordinator</option>
                  {users.coordinators.map((coordinator) => (
                    <option key={coordinator.id} value={coordinator.id}>
                      {coordinator.name} ({coordinator.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Processor
                </label>
                <select
                  name="processorId"
                  value={formData.processorId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a processor</option>
                  {users.processors.map((processor) => (
                    <option key={processor.id} value={processor.id}>
                      {processor.name} ({processor.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Address Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  maxLength={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code *
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* GPS Coordinates */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">GPS Coordinates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GPS: Lat
                </label>
                <input
                  type="number"
                  name="gpsLat"
                  value={formData.gpsLat}
                  onChange={handleInputChange}
                  step="any"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GPS: Lon
                </label>
                <input
                  type="number"
                  name="gpsLon"
                  value={formData.gpsLon}
                  onChange={handleInputChange}
                  step="any"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Access Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Access Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lock Code
                </label>
                <input
                  type="text"
                  name="lockCode"
                  value={formData.lockCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lock Location
                </label>
                <input
                  type="text"
                  name="lockLocation"
                  value={formData.lockLocation}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Code
                </label>
                <input
                  type="text"
                  name="keyCode"
                  value={formData.keyCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gate Code
                </label>
                <input
                  type="text"
                  name="gateCode"
                  value={formData.gateCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lot Size
                </label>
                <input
                  type="text"
                  name="lotSize"
                  value={formData.lotSize}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Contractor Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Contractor Information</h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Contractor
                </label>
                <select
                  name="assignedContractorId"
                  value={formData.assignedContractorId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a contractor</option>
                  {users.contractors.map((contractor) => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name} ({contractor.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Date
                </label>
                <input
                  type="text"
                  value={workOrder.assignedDate ? new Date(workOrder.assignedDate).toLocaleDateString() : "Not Assigned"}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Scheduling</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  EST. Completion
                </label>
                <input
                  type="date"
                  name="estCompletion"
                  value={formData.estCompletion}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Field Complete
                </label>
                <input
                  type="text"
                  value={workOrder.fieldComplete ? new Date(workOrder.fieldComplete).toLocaleDateString() : "Not Complete"}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              href={`/dashboard/admin/work-orders/${params.id}`}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-md text-sm font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>

          {/* Status Messages */}
          {submitStatus === "success" && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Work order updated successfully!
                  </p>
                </div>
              </div>
            </div>
          )}

          {submitStatus === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    There was an error updating the work order. Please try again.
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
