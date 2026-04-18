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

  const workOrderStatusOptions = [
    { value: "NEW", label: "New" },
    { value: "UNASSIGNED", label: "Unassigned" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "ASSIGNED", label: "Assigned" },
    { value: "READ", label: "Read" },
    { value: "COMPLETED", label: "Completed" },
    { value: "FIELD_COMPLETE", label: "Field Complete" },
    { value: "OFFICE_APPROVED", label: "Office Approved" },
    { value: "SENT_TO_CLIENT", label: "Sent to Client" },
    { value: "CLOSED", label: "Closed" },
    { value: "CANCELLED", label: "Cancelled" },
  ]

  const [formData, setFormData] = useState({
    status: "",
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
          status: data.status || "",
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
        const errorData = await response.json().catch(() => ({}))
        console.error("Failed to update work order:", errorData)
        alert(errorData?.error || "Failed to update work order.")
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
      <div className="flex min-h-screen items-center justify-center bg-[#11182a]">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[#ff8a6a]" />
          <h2 className="mb-2 text-xl font-semibold text-white">Work Order Not Found</h2>
          <p className="mb-4 text-[#9aa6cc]">The work order you're looking for doesn't exist or you don't have permission to view it.</p>
          <Link href="/dashboard/admin/work-orders" className="text-[#7da2ff] hover:text-[#a9c0ff]">
            ← Back to Work Orders
          </Link>
        </div>
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#11182a]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#ff6b3c]"></div>
          <p className="mt-4 text-[#9aa6cc]">Loading work order...</p>
        </div>
      </div>
    )
  }

  const cardClassName = "rounded-[28px] border border-white/8 bg-[#242c45] p-6 shadow-[0_24px_60px_rgba(7,10,20,0.22)]"
  const labelClassName = "mb-2 block text-sm font-medium text-[#dce5ff]"
  const inputClassName = "w-full rounded-2xl border border-white/10 bg-[#1b2236] px-4 py-3 text-[#edf2ff] outline-none transition placeholder:text-[#6f7a9f] focus:border-[#7da2ff] focus:ring-2 focus:ring-[#7da2ff]/25"
  const disabledInputClassName = "w-full rounded-2xl border border-white/10 bg-[#171e30] px-4 py-3 text-[#8f9cc2]"

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,122,73,0.10),transparent_28%),linear-gradient(180deg,#12192b_0%,#0f1626_100%)] text-[#edf2ff]">
      {/* Header */}
      <div className="border-b border-white/8 bg-[#1a2135]/95 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href={`/dashboard/admin/work-orders/${params.id}`}
                className="text-[#9aa6cc] hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-semibold text-white">
                Edit Work Order: {workOrder.workOrderNumber || workOrder.title}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href={`/dashboard/admin/work-orders/${params.id}`}
                className="rounded-2xl border border-white/10 bg-[#2a334c] px-5 py-2.5 text-sm font-medium text-[#edf2ff] transition hover:bg-[#34405f]"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className={cardClassName}>
            <h2 className="mb-6 text-lg font-medium text-white">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClassName}>
                  Work Order Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>
                  Service Type *
                </label>
                <select
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleInputChange}
                  required
                  className={inputClassName}
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
                <label className={labelClassName}>
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className={inputClassName}
                />
              </div>
            </div>
          </div>

          {/* Work Order Details */}
          <div className={cardClassName}>
            <h2 className="mb-6 text-lg font-medium text-white">Work Order Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClassName}>
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className={inputClassName}
                >
                  {workOrderStatusOptions.map((statusOption) => (
                    <option key={statusOption.value} value={statusOption.value}>
                      {statusOption.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClassName}>
                  Work Order Number
                </label>
                <input
                  type="text"
                  name="workOrderNumber"
                  value={formData.workOrderNumber}
                  onChange={handleInputChange}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>
                  Due Date *
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  required
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>
                  Coordinator
                </label>
                <select
                  name="coordinatorId"
                  value={formData.coordinatorId}
                  onChange={handleInputChange}
                  className={inputClassName}
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
                <label className={labelClassName}>
                  Processor
                </label>
                <select
                  name="processorId"
                  value={formData.processorId}
                  onChange={handleInputChange}
                  className={inputClassName}
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
          <div className={cardClassName}>
            <h2 className="mb-6 text-lg font-medium text-white">Address Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClassName}>
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleInputChange}
                  required
                  className={inputClassName}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClassName}>
                  Address Line 2
                </label>
                <input
                  type="text"
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleInputChange}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  maxLength={2}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>
                  Postal Code *
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  required
                  className={inputClassName}
                />
              </div>
            </div>
          </div>

          {/* GPS Coordinates */}
          <div className={cardClassName}>
            <h2 className="mb-6 text-lg font-medium text-white">GPS Coordinates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClassName}>
                  GPS: Lat
                </label>
                <input
                  type="number"
                  name="gpsLat"
                  value={formData.gpsLat}
                  onChange={handleInputChange}
                  step="any"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>
                  GPS: Lon
                </label>
                <input
                  type="number"
                  name="gpsLon"
                  value={formData.gpsLon}
                  onChange={handleInputChange}
                  step="any"
                  className={inputClassName}
                />
              </div>
            </div>
          </div>

          {/* Access Information */}
          <div className={cardClassName}>
            <h2 className="mb-6 text-lg font-medium text-white">Access Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClassName}>
                  Lock Code
                </label>
                <input
                  type="text"
                  name="lockCode"
                  value={formData.lockCode}
                  onChange={handleInputChange}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>
                  Lock Location
                </label>
                <input
                  type="text"
                  name="lockLocation"
                  value={formData.lockLocation}
                  onChange={handleInputChange}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>
                  Key Code
                </label>
                <input
                  type="text"
                  name="keyCode"
                  value={formData.keyCode}
                  onChange={handleInputChange}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>
                  Gate Code
                </label>
                <input
                  type="text"
                  name="gateCode"
                  value={formData.gateCode}
                  onChange={handleInputChange}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>
                  Lot Size
                </label>
                <input
                  type="text"
                  name="lotSize"
                  value={formData.lotSize}
                  onChange={handleInputChange}
                  className={inputClassName}
                />
              </div>
            </div>
          </div>

          {/* Contractor Information */}
          <div className={cardClassName}>
            <h2 className="mb-6 text-lg font-medium text-white">Contractor Information</h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className={labelClassName}>
                  Assigned Contractor
                </label>
                <select
                  name="assignedContractorId"
                  value={formData.assignedContractorId}
                  onChange={handleInputChange}
                  className={inputClassName}
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
                <label className={labelClassName}>
                  Assigned Date
                </label>
                <input
                  type="text"
                  value={workOrder.assignedDate ? new Date(workOrder.assignedDate).toLocaleDateString() : "Not Assigned"}
                  disabled
                  className={disabledInputClassName}
                />
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div className={cardClassName}>
            <h2 className="mb-6 text-lg font-medium text-white">Scheduling</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClassName}>
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>
                  EST. Completion
                </label>
                <input
                  type="date"
                  name="estCompletion"
                  value={formData.estCompletion}
                  onChange={handleInputChange}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>
                  Field Complete
                </label>
                <input
                  type="text"
                  value={workOrder.fieldComplete ? new Date(workOrder.fieldComplete).toLocaleDateString() : "Not Complete"}
                  disabled
                  className={disabledInputClassName}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              href={`/dashboard/admin/work-orders/${params.id}`}
              className="rounded-2xl border border-white/10 bg-[#2a334c] px-6 py-3 text-sm font-medium text-[#edf2ff] transition hover:bg-[#34405f]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-6 py-3 text-sm font-medium text-white shadow-[0_16px_32px_rgba(255,107,60,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
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
            <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-emerald-300" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-emerald-200">
                    Work order updated successfully!
                  </p>
                </div>
              </div>
            </div>
          )}

          {submitStatus === "error" && (
            <div className="rounded-[24px] border border-[#ff8a6a]/20 bg-[#ff8a6a]/10 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-[#ffb19e]" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-[#ffd4c8]">
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
