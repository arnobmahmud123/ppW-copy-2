"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft,
  MapPin,
  Calendar,
  FileText,
  Upload,
  Send
} from "lucide-react"

export default function SubmitWorkOrder() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
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
    attachments: [] as File[],
    // New fields
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

  const serviceTypes = [
    { value: "GRASS_CUT", label: "Grass Cutting" },
    { value: "DEBRIS_REMOVAL", label: "Debris Removal" },
    { value: "WINTERIZATION", label: "Winterization" },
    { value: "BOARD_UP", label: "Board Up" },
    { value: "INSPECTION", label: "Inspection" },
    { value: "MOLD_REMEDIATION", label: "Mold Remediation" },
    { value: "OTHER", label: "Other" }
  ]

  const states = [
    { value: "MO", label: "Missouri" },
    { value: "AR", label: "Arkansas" },
    { value: "AK", label: "Alaska" }
  ]

  // Fetch users for dropdowns
  useEffect(() => {
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

    fetchUsers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus("idle")

    try {
      console.log("Submitting work order with data:", formData)
      
      const response = await fetch("/api/work-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitStatus("success")
        // Redirect to dashboard after successful submission
        setTimeout(() => {
          router.push("/dashboard/client")
        }, 2000)
      } else {
        const errorData = await response.json()
        console.error("Work order submission error:", errorData)
        
        // Show specific validation error if available
        if (errorData.details && Array.isArray(errorData.details)) {
          const firstError = errorData.details[0]
          alert(`Validation Error: ${firstError.message} (Field: ${firstError.path.join('.')})`)
        } else if (errorData.message) {
          alert(`Error: ${errorData.message}`)
        } else {
          alert("There was an error submitting your work order. Please try again.")
        }
        
        setSubmitStatus("error")
      }
    } catch (error) {
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({
        ...prev,
        attachments: Array.from(e.target.files!)
      }))
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to submit a work order.</p>
          <Link
            href="/auth/signin"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">PropertyPreserve Pro</Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/client"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Submit Work Order</h1>
            <p className="mt-1 text-sm text-gray-600">
              Provide details about the property preservation work you need completed.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            {submitStatus === "success" && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
                Work order submitted successfully! Redirecting to dashboard...
              </div>
            )}
            
            {submitStatus === "error" && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                There was an error submitting your work order. Please try again.
              </div>
            )}

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Work Order Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Grass Cutting - 123 Main St"
                  />
                </div>

                <div>
                  <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700 mb-2">
                    Service Type *
                  </label>
                  <select
                    id="serviceType"
                    name="serviceType"
                    required
                    value={formData.serviceType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a service type</option>
                    {serviceTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    required
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the work that needs to be completed..."
                  />
                </div>
              </div>
            </div>

            {/* Property Address */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Property Address
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    id="addressLine1"
                    name="addressLine1"
                    required
                    value={formData.addressLine1}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    id="addressLine2"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Apt 4B, Suite 200, etc."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Springfield"
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <select
                      id="state"
                      name="state"
                      required
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select state</option>
                      {states.map((state) => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      id="postalCode"
                      name="postalCode"
                      required
                      value={formData.postalCode}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="12345"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduling */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Scheduling
              </h3>
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Due Date
                </label>
                <input
                  type="date"
                  id="dueDate"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Work Order Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Work Order Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="workOrderNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Work Order Number
                  </label>
                  <input
                    type="text"
                    id="workOrderNumber"
                    name="workOrderNumber"
                    value={formData.workOrderNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., WO-2024-001"
                  />
                </div>

                <div>
                  <label htmlFor="coordinatorId" className="block text-sm font-medium text-gray-700 mb-2">
                    Coordinator
                  </label>
                  <select
                    id="coordinatorId"
                    name="coordinatorId"
                    value={formData.coordinatorId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label htmlFor="processorId" className="block text-sm font-medium text-gray-700 mb-2">
                    Processor
                  </label>
                  <select
                    id="processorId"
                    name="processorId"
                    value={formData.processorId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a processor</option>
                    {users.processors.map((processor) => (
                      <option key={processor.id} value={processor.id}>
                        {processor.name} ({processor.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-2">
                    Client
                  </label>
                  <input
                    type="text"
                    id="client"
                    name="client"
                    value={session?.user?.name || ""}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    placeholder="Current user"
                  />
                </div>
              </div>
            </div>

            {/* GPS Coordinates */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                GPS Coordinates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="gpsLat" className="block text-sm font-medium text-gray-700 mb-2">
                    GPS Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    id="gpsLat"
                    name="gpsLat"
                    value={formData.gpsLat}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 37.7749"
                  />
                </div>

                <div>
                  <label htmlFor="gpsLon" className="block text-sm font-medium text-gray-700 mb-2">
                    GPS Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    id="gpsLon"
                    name="gpsLon"
                    value={formData.gpsLon}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., -122.4194"
                  />
                </div>
              </div>
            </div>

            {/* Access Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Access Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="lockCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Lock Code
                  </label>
                  <input
                    type="text"
                    id="lockCode"
                    name="lockCode"
                    value={formData.lockCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Lock combination or code"
                  />
                </div>

                <div>
                  <label htmlFor="lockLocation" className="block text-sm font-medium text-gray-700 mb-2">
                    Lock Location
                  </label>
                  <input
                    type="text"
                    id="lockLocation"
                    name="lockLocation"
                    value={formData.lockLocation}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Front door, Side gate"
                  />
                </div>

                <div>
                  <label htmlFor="keyCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Key Code
                  </label>
                  <input
                    type="text"
                    id="keyCode"
                    name="keyCode"
                    value={formData.keyCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Key box code or location"
                  />
                </div>

                <div>
                  <label htmlFor="gateCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Gate Code
                  </label>
                  <input
                    type="text"
                    id="gateCode"
                    name="gateCode"
                    value={formData.gateCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Gate access code"
                  />
                </div>

                <div>
                  <label htmlFor="lotSize" className="block text-sm font-medium text-gray-700 mb-2">
                    Lot Size
                  </label>
                  <input
                    type="text"
                    id="lotSize"
                    name="lotSize"
                    value={formData.lotSize}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 0.25 acres, 10,890 sq ft"
                  />
                </div>
              </div>
            </div>

            {/* Contractor Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Contractor Information
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="assignedContractorId" className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned Contractor
                  </label>
                  <select
                    id="assignedContractorId"
                    name="assignedContractorId"
                    value={formData.assignedContractorId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a contractor</option>
                    {users.contractors.map((contractor) => (
                      <option key={contractor.id} value={contractor.id}>
                        {contractor.name} ({contractor.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Scheduling */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Scheduling
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="assignedDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned Date
                  </label>
                  <input
                    type="date"
                    id="assignedDate"
                    name="assignedDate"
                    value=""
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    placeholder="Dynamic"
                  />
                  <p className="mt-1 text-xs text-gray-500">Set automatically when assigned</p>
                </div>

                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="estCompletion" className="block text-sm font-medium text-gray-700 mb-2">
                    EST. Completion
                  </label>
                  <input
                    type="date"
                    id="estCompletion"
                    name="estCompletion"
                    value={formData.estCompletion}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Additional Information
              </h3>
              <div>
                <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions
                </label>
                <textarea
                  id="specialInstructions"
                  name="specialInstructions"
                  rows={3}
                  value={formData.specialInstructions}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any special requirements, access instructions, or additional details..."
                />
              </div>
            </div>

            {/* File Attachments */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                File Attachments
              </h3>
              <div>
                <label htmlFor="attachments" className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Files (Optional)
                </label>
                <input
                  type="file"
                  id="attachments"
                  name="attachments"
                  multiple
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Upload photos, documents, or other relevant files (PDF, JPG, PNG, DOC)
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Submit Work Order
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
