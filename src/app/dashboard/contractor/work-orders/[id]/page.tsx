"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  User,
  MessageSquare,
  Send,
  FileText,
  Camera,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  Plus,
  Edit,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  X
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
  workOrderNumber?: string
  specialInstructions?: string
  gpsLat?: number
  gpsLon?: number
  lockCode?: string
  lockLocation?: string
  keyCode?: string
  gateCode?: string
  lotSize?: string
  startDate?: string
  estCompletion?: string
  createdAt: string
  updatedAt: string
  client: {
    id: string
    name: string
    email: string
    phone?: string
  }
  assignedContractor?: {
    id: string
    name: string
    email: string
    phone?: string
  }
  assignedCoordinator?: {
    id: string
    name: string
    email: string
    phone?: string
  }
  assignedProcessor?: {
    id: string
    name: string
    email: string
    phone?: string
  }
  _count: {
    messages: number
    files: number
  }
}

interface Message {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string
    email: string
    role: string
  }
}

export default function ContractorWorkOrderDetails() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const workOrderId = params.id as string

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [activeTab, setActiveTab] = useState<"details" | "tasks" | "messages" | "files">("details")
  const [tasks, setTasks] = useState<any[]>([])
  const [taskMessages, setTaskMessages] = useState<{[taskId: string]: Message[]}>({})
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [newTaskMessage, setNewTaskMessage] = useState("")
  const [sendingTaskMessage, setSendingTaskMessage] = useState(false)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [newTask, setNewTask] = useState({ 
    taskType: "",
    taskName: "",
    qty: 1,
    uom: "",
    contractorPrice: 0,
    clientPrice: 0,
    comments: "",
    violation: false,
    damage: false,
    hazards: false
  })
  const [editingTask, setEditingTask] = useState<any>(null)
  const [savingTask, setSavingTask] = useState(false)
  const [showTaskMessageModal, setShowTaskMessageModal] = useState<{taskId: string, taskName: string} | null>(null)
  const [loadingMessageCounts, setLoadingMessageCounts] = useState<{[taskId: string]: boolean}>({})
  const [files, setFiles] = useState<any[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("PHOTO_BEFORE")
  const [showImageModal, setShowImageModal] = useState<{url: string, title: string} | null>(null)

  useEffect(() => {
    if (session?.user?.role === "CONTRACTOR" && workOrderId) {
      fetchWorkOrder()
      fetchMessages()
      fetchTasks()
      fetchFiles()
    }
  }, [session, workOrderId])

  // Handle tab parameter from URL
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['details', 'tasks', 'messages', 'files'].includes(tab)) {
      setActiveTab(tab as "details" | "tasks" | "messages" | "files")
    }
  }, [searchParams])

  const fetchWorkOrder = async () => {
    try {
      const response = await fetch(`/api/work-orders/${workOrderId}`)
      if (response.ok) {
        const data = await response.json()
        setWorkOrder(data)
      } else {
        console.error("Failed to fetch work order")
        router.push("/dashboard/contractor")
      }
    } catch (error) {
      console.error("Error fetching work order:", error)
      router.push("/dashboard/contractor")
    }
  }

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/tasks`)
      if (response.ok) {
        const data = await response.json()
        const tasksData = data.tasks || []
        setTasks(tasksData)
        
        // Fetch messages for all tasks to show correct message counts
        for (const task of tasksData) {
          if (task.id && !taskMessages[task.id]) {
            await fetchTaskMessages(task.id)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    }
  }

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/work-orders/${workOrderId}`)
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files || [])
      }
    } catch (error) {
      console.error("Error fetching files:", error)
    }
  }

  const fetchTaskMessages = async (taskId: string) => {
    try {
      setLoadingMessageCounts(prev => ({ ...prev, [taskId]: true }))
      const response = await fetch(`/api/work-orders/${workOrderId}/messages?taskId=${taskId}`)
      if (response.ok) {
        const data = await response.json()
        setTaskMessages(prev => ({
          ...prev,
          [taskId]: data.messages || []
        }))
      }
    } catch (error) {
      console.error("Error fetching task messages:", error)
    } finally {
      setLoadingMessageCounts(prev => ({ ...prev, [taskId]: false }))
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      setSendingMessage(true)
      const response = await fetch(`/api/work-orders/${workOrderId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newMessage.trim(),
        }),
      })

      if (response.ok) {
        setNewMessage("")
        fetchMessages() // Refresh messages
      } else {
        console.error("Failed to send message")
      }
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSendingMessage(false)
    }
  }

  const sendTaskMessage = async (taskId: string) => {
    if (!newTaskMessage.trim()) return

    try {
      setSendingTaskMessage(true)
      const response = await fetch(`/api/work-orders/${workOrderId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newTaskMessage.trim(),
          taskId: taskId,
        }),
      })

      if (response.ok) {
        setNewTaskMessage("")
        await fetchTaskMessages(taskId) // Refresh task messages
      } else {
        console.error("Failed to send task message")
      }
    } catch (error) {
      console.error("Error sending task message:", error)
    } finally {
      setSendingTaskMessage(false)
    }
  }

  const saveTask = async () => {
    if (!newTask.taskType || !newTask.taskName) return

    try {
      setSavingTask(true)
      const updatedTasks = editingTask 
        ? tasks.map(task => task.id === editingTask.id ? { ...task, ...newTask } : task)
        : [...tasks, { ...newTask, id: Date.now().toString(), authorId: session?.user?.id }]

      const response = await fetch(`/api/work-orders/${workOrderId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tasks: updatedTasks,
        }),
      })

      if (response.ok) {
        setTasks(updatedTasks)
        
        // If this is a new task, fetch its messages to show correct count
        if (!editingTask) {
          const newTaskId = updatedTasks[updatedTasks.length - 1]?.id
          if (newTaskId) {
            await fetchTaskMessages(newTaskId)
          }
        }
        
        setShowAddTaskModal(false)
        setEditingTask(null)
        setNewTask({ 
          taskType: "",
          taskName: "",
          qty: 1,
          uom: "",
          contractorPrice: 0,
          clientPrice: 0,
          comments: "",
          violation: false,
          damage: false,
          hazards: false
        })
      } else {
        console.error("Failed to save task")
      }
    } catch (error) {
      console.error("Error saving task:", error)
    } finally {
      setSavingTask(false)
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return

    try {
      const updatedTasks = tasks.filter(task => task.id !== taskId)
      
      const response = await fetch(`/api/work-orders/${workOrderId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tasks: updatedTasks,
        }),
      })

      if (response.ok) {
        setTasks(updatedTasks)
        if (selectedTaskId === taskId) {
          setSelectedTaskId(null)
        }
      } else {
        console.error("Failed to delete task")
      }
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }

  const canDeleteTask = (task: any) => {
    // Contractors can only delete their own tasks
    return task.authorId === session?.user?.id
  }

  const canEditTask = (task: any) => {
    // Contractors can only edit their own tasks
    return task.authorId === session?.user?.id
  }

  const getTaskDisplayName = (task: any) => {
    if (task.taskName && task.taskType) {
      return `${task.taskType} - ${task.taskName}`
    } else if (task.taskName) {
      return task.taskName
    } else if (task.taskType) {
      return task.taskType
    } else {
      return "Unnamed Task"
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploadingFile(true)
      const formData = new FormData()
      formData.append("file", file)
      formData.append("workOrderId", workOrderId)
      formData.append("category", selectedCategory)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        await fetchFiles() // Refresh files list
        await fetchWorkOrder() // Refresh work order to update file count
        // Reset file input
        event.target.value = ""
      } else {
        const errorData = await response.json()
        console.error("Upload failed:", errorData)
        alert(`Upload failed: ${errorData.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      alert("Error uploading file. Please try again.")
    } finally {
      setUploadingFile(false)
    }
  }

  const deleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return

    try {
      const response = await fetch(`/api/upload/${fileId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchFiles() // Refresh files list
        await fetchWorkOrder() // Refresh work order to update file count
      } else {
        const errorData = await response.json()
        console.error("Delete failed:", errorData)
        alert(`Delete failed: ${errorData.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error deleting file:", error)
      alert("Error deleting file. Please try again.")
    }
  }

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case "PHOTO_BEFORE":
        return "Before Photos"
      case "PHOTO_DURING":
        return "During Photos"
      case "PHOTO_AFTER":
        return "After Photos"
      case "PHOTO_BID":
        return "Bid Photos"
      case "PHOTO_INSPECTION":
        return "Inspection Photos"
      case "DOCUMENT_PDF":
        return "PDF Documents"
      case "DOCUMENT_PCR":
        return "PCR Documents"
      default:
        return "Other Files"
    }
  }

  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith("image/")
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading work order details...</p>
        </div>
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Work Order Not Found</h2>
          <p className="text-gray-600 mb-4">The work order you're looking for doesn't exist or you don't have access to it.</p>
          <Link
            href="/dashboard/contractor"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const StatusIcon = getStatusIcon(workOrder.status)
  const address = `${workOrder.addressLine1}${workOrder.addressLine2 ? ', ' + workOrder.addressLine2 : ''}, ${workOrder.city}, ${workOrder.state} ${workOrder.postalCode}`

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/dashboard/contractor"
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{workOrder.title}</h1>
                <p className="text-sm text-gray-500">Work Order #{workOrder.workOrderNumber || workOrder.id.slice(-8)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(workOrder.priority || 'MEDIUM')}`}>
                {workOrder.priority || 'MEDIUM'}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(workOrder.status)}`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {workOrder.status.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("details")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "details"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Details
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "tasks"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <CheckCircle className="h-4 w-4 inline mr-2" />
              Tasks
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "messages"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <MessageSquare className="h-4 w-4 inline mr-2" />
              Messages ({messages?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("files")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "files"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Camera className="h-4 w-4 inline mr-2" />
              Photos ({workOrder._count.files})
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === "details" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{workOrder.description}</p>
              </div>

              {/* Service Details */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Service Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Service Type</label>
                    <p className="mt-1 text-sm text-gray-900">{workOrder.serviceType.replace("_", " ")}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lot Size</label>
                    <p className="mt-1 text-sm text-gray-900">{workOrder.lotSize || "Not specified"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {workOrder.startDate ? formatDate(workOrder.startDate) : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Est. Completion</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {workOrder.estCompletion ? formatDate(workOrder.estCompletion) : "Not specified"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Special Instructions */}
              {workOrder.specialInstructions && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Special Instructions</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{workOrder.specialInstructions}</p>
                </div>
              )}

              {/* Access Information */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Access Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lock Code</label>
                    <p className="mt-1 text-sm text-gray-900">{workOrder.lockCode || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lock Location</label>
                    <p className="mt-1 text-sm text-gray-900">{workOrder.lockLocation || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Key Code</label>
                    <p className="mt-1 text-sm text-gray-900">{workOrder.keyCode || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gate Code</label>
                    <p className="mt-1 text-sm text-gray-900">{workOrder.gateCode || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Location */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <p className="text-sm text-gray-900">{address}</p>
                    {workOrder.gpsLat && workOrder.gpsLon && (
                      <p className="text-xs text-gray-500 mt-1">
                        GPS: {workOrder.gpsLat.toFixed(6)}, {workOrder.gpsLon.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Client Information */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Client</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-900">{workOrder.client.name}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-900">{workOrder.client.email}</span>
                  </div>
                  {workOrder.client.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-900">{workOrder.client.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(workOrder.createdAt)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Due Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {workOrder.dueDate ? formatDate(workOrder.dueDate) : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(workOrder.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Team</h3>
                <div className="space-y-3">
                  {workOrder.assignedCoordinator && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Coordinator</label>
                      <p className="mt-1 text-sm text-gray-900">{workOrder.assignedCoordinator.name}</p>
                    </div>
                  )}
                  {workOrder.assignedProcessor && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Processor</label>
                      <p className="mt-1 text-sm text-gray-900">{workOrder.assignedProcessor.name}</p>
                    </div>
                  )}
                  {workOrder.assignedContractor && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contractor</label>
                      <p className="mt-1 text-sm text-gray-900">{workOrder.assignedContractor.name}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="space-y-6">
            {/* Tasks Header */}
            <div className="bg-white shadow rounded-lg">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
                  <button
                    onClick={() => {
                      setEditingTask(null)
                      setNewTask({ 
                        taskType: "",
                        taskName: "",
                        qty: 1,
                        uom: "",
                        contractorPrice: 0,
                        clientPrice: 0,
                        comments: "",
                        violation: false,
                        damage: false,
                        hazards: false
                      })
                      setShowAddTaskModal(true)
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {tasks.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p>No tasks created yet.</p>
                    <p className="text-sm mt-2">Click "Add Task" to create your first task.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Task Type</th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Task Name</th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Qty</th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Messages</th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                            Contractor
                            <div className="text-xs font-normal">
                              <div>Price</div>
                              <div>Total Price</div>
                            </div>
                          </th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                            Client
                            <div className="text-xs font-normal">
                              <div>Price</div>
                              <div>Total Price</div>
                            </div>
                          </th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Comments</th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((task, index) => (
                          <tr key={task.id || index}>
                            <td className="border border-gray-300 px-3 py-2">
                              {canEditTask(task) ? (
                                <select 
                                  value={task.taskType || ""}
                                  onChange={(e) => {
                                    const updatedTasks = tasks.map(t => 
                                      t.id === task.id ? { ...t, taskType: e.target.value } : t
                                    )
                                    setTasks(updatedTasks)
                                  }}
                                  className="w-full border-0 text-sm"
                                >
                                  <option value="">Select Task Type</option>
                                  <option value="Completion">Completion</option>
                                  <option value="Bid">Bid</option>
                                  <option value="Inspection">Inspection</option>
                                </select>
                              ) : (
                                <span className="text-sm text-gray-700">{task.taskType || "Not Set"}</span>
                              )}
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              {canEditTask(task) ? (
                                <select 
                                  value={task.taskName || ""}
                                  onChange={(e) => {
                                    const updatedTasks = tasks.map(t => 
                                      t.id === task.id ? { ...t, taskName: e.target.value } : t
                                    )
                                    setTasks(updatedTasks)
                                  }}
                                  className="w-full border-0 text-sm"
                                >
                                  <option value="">Select Task</option>
                                  <option value="Grass Cut MCS">Grass Cut MCS</option>
                                  <option value="Debris Removal">Debris Removal</option>
                                  <option value="Winterization">Winterization</option>
                                  <option value="Board Up">Board Up</option>
                                  <option value="Inspection">Inspection</option>
                                  <option value="Mold Remediation">Mold Remediation</option>
                                </select>
                              ) : (
                                <span className="text-sm text-gray-700">{task.taskName || "Not Set"}</span>
                              )}
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              {canEditTask(task) ? (
                                <input 
                                  type="number" 
                                  value={task.qty || 1}
                                  onChange={(e) => {
                                    const updatedTasks = tasks.map(t => 
                                      t.id === task.id ? { ...t, qty: parseInt(e.target.value) || 1 } : t
                                    )
                                    setTasks(updatedTasks)
                                  }}
                                  className="w-full border-0 text-sm"
                                />
                              ) : (
                                <span className="text-sm text-gray-700">{task.qty || 1}</span>
                              )}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-center">
                              <button
                                onClick={() => {
                                  setShowTaskMessageModal({ taskId: task.id, taskName: getTaskDisplayName(task) })
                                  fetchTaskMessages(task.id)
                                }}
                                className="flex items-center justify-center space-x-1 text-blue-600 hover:text-blue-800"
                              >
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  {loadingMessageCounts[task.id] ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                  ) : (
                                    taskMessages[task.id]?.length || 0
                                  )}
                                </span>
                              </button>
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              <div className="space-y-1">
                                {canEditTask(task) ? (
                                  <>
                                    <input 
                                      type="number" 
                                      value={task.contractorPrice || 0}
                                      onChange={(e) => {
                                        const updatedTasks = tasks.map(t => 
                                          t.id === task.id ? { ...t, contractorPrice: parseFloat(e.target.value) || 0 } : t
                                        )
                                        setTasks(updatedTasks)
                                      }}
                                      className="w-full border-0 text-sm"
                                      placeholder="$ 0.00"
                                    />
                                    <input 
                                      type="number" 
                                      value={(task.contractorPrice || 0) * (task.qty || 1)}
                                      className="w-full border-0 text-sm"
                                      placeholder="$ 0.00"
                                      readOnly
                                    />
                                  </>
                                ) : (
                                  <>
                                    <span className="text-sm text-gray-700">${(task.contractorPrice || 0).toFixed(2)}</span>
                                    <span className="text-sm text-gray-700">${((task.contractorPrice || 0) * (task.qty || 1)).toFixed(2)}</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              <div className="space-y-1">
                                {canEditTask(task) ? (
                                  <>
                                    <input 
                                      type="number" 
                                      value={task.clientPrice || 0}
                                      onChange={(e) => {
                                        const updatedTasks = tasks.map(t => 
                                          t.id === task.id ? { ...t, clientPrice: parseFloat(e.target.value) || 0 } : t
                                        )
                                        setTasks(updatedTasks)
                                      }}
                                      className="w-full border-0 text-sm"
                                      placeholder="$ 0.00"
                                    />
                                    <input 
                                      type="number" 
                                      value={(task.clientPrice || 0) * (task.qty || 1)}
                                      className="w-full border-0 text-sm"
                                      placeholder="$ 0.00"
                                      readOnly
                                    />
                                  </>
                                ) : (
                                  <>
                                    <span className="text-sm text-gray-700">${(task.clientPrice || 0).toFixed(2)}</span>
                                    <span className="text-sm text-gray-700">${((task.clientPrice || 0) * (task.qty || 1)).toFixed(2)}</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              {canEditTask(task) ? (
                                <textarea 
                                  value={task.comments || ""}
                                  onChange={(e) => {
                                    const updatedTasks = tasks.map(t => 
                                      t.id === task.id ? { ...t, comments: e.target.value } : t
                                    )
                                    setTasks(updatedTasks)
                                  }}
                                  className="w-full border-0 text-sm resize-y min-h-24"
                                  rows={4}
                                />
                              ) : (
                                <span className="text-sm text-gray-700">{task.comments || "No comments"}</span>
                              )}
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              <div className="flex items-center space-x-1">
                                {canEditTask(task) && (
                                  <>
                                    <button className="p-1 hover:bg-gray-100 rounded">
                                      <Copy className="h-4 w-4" />
                                    </button>
                                    <button className="p-1 hover:bg-gray-100 rounded">
                                      <ChevronUp className="h-4 w-4" />
                                    </button>
                                    <button className="p-1 hover:bg-gray-100 rounded">
                                      <ChevronDown className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                                {canDeleteTask(task) && (
                                  <button 
                                    onClick={() => deleteTask(task.id)}
                                    className="p-1 hover:bg-gray-100 rounded text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50">
                          <td colSpan={3} className="border border-gray-300 px-3 py-2 font-medium">
                            Count {tasks.length}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                            ${tasks.reduce((sum, task) => sum + ((task.contractorPrice || 0) * (task.qty || 1)), 0).toFixed(2)}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                            ${tasks.reduce((sum, task) => sum + ((task.clientPrice || 0) * (task.qty || 1)), 0).toFixed(2)}
                          </td>
                          <td colSpan={2} className="border border-gray-300 px-3 py-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Add/Edit Task Modal */}
            {showAddTaskModal && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                  <div className="mt-3">
                    <h3 className="text-lg font-medium text-gray-900 mb-6">
                      {editingTask ? "Edit Task" : "Add New Task"}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Task Type
                        </label>
                        <select
                          value={newTask.taskType || ""}
                          onChange={(e) => setNewTask(prev => ({ ...prev, taskType: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Task Type</option>
                          <option value="Completion">Completion</option>
                          <option value="Bid">Bid</option>
                          <option value="Inspection">Inspection</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Task Name
                        </label>
                        <select
                          value={newTask.taskName || ""}
                          onChange={(e) => setNewTask(prev => ({ ...prev, taskName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Task</option>
                          <option value="Grass Cut MCS">Grass Cut MCS</option>
                          <option value="Debris Removal">Debris Removal</option>
                          <option value="Winterization">Winterization</option>
                          <option value="Board Up">Board Up</option>
                          <option value="Inspection">Inspection</option>
                          <option value="Mold Remediation">Mold Remediation</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={newTask.qty || 1}
                          onChange={(e) => setNewTask(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit of Measure
                        </label>
                        <input
                          type="text"
                          value={newTask.uom || ""}
                          onChange={(e) => setNewTask(prev => ({ ...prev, uom: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., sq ft, each, hours"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contractor Price
                        </label>
                        <input
                          type="number"
                          value={newTask.contractorPrice || 0}
                          onChange={(e) => setNewTask(prev => ({ ...prev, contractorPrice: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Client Price
                        </label>
                        <input
                          type="number"
                          value={newTask.clientPrice || 0}
                          onChange={(e) => setNewTask(prev => ({ ...prev, clientPrice: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Comments
                        </label>
                        <textarea
                          value={newTask.comments || ""}
                          onChange={(e) => setNewTask(prev => ({ ...prev, comments: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                          placeholder="Enter task comments"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between mt-6">
                      <button
                        onClick={() => {
                          setShowAddTaskModal(false)
                          setEditingTask(null)
                          setNewTask({ 
                            taskType: "",
                            taskName: "",
                            qty: 1,
                            uom: "",
                            contractorPrice: 0,
                            clientPrice: 0,
                            comments: "",
                            violation: false,
                            damage: false,
                            hazards: false
                          })
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveTask}
                        disabled={!newTask.taskType || !newTask.taskName || savingTask}
                        className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingTask ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Task Message Modal */}
            {showTaskMessageModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        Messages for: {showTaskMessageModal.taskName}
                      </h3>
                      <button
                        onClick={() => setShowTaskMessageModal(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4 max-h-96 overflow-y-auto">
                    <div className="space-y-4">
                      {taskMessages[showTaskMessageModal.taskId]?.map((message) => (
                        <div key={message.id} className="border-l-4 border-blue-500 pl-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {message.author.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{message.content}</p>
                        </div>
                      ))}
                      {(!taskMessages[showTaskMessageModal.taskId] || taskMessages[showTaskMessageModal.taskId].length === 0) && (
                        <p className="text-gray-500 text-center py-4">No messages yet</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <textarea
                        value={newTaskMessage}
                        onChange={(e) => setNewTaskMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={2}
                      />
                      <button
                        onClick={() => sendTaskMessage(showTaskMessageModal.taskId)}
                        disabled={!newTaskMessage.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "messages" && (
          <div className="bg-white shadow rounded-lg">
            {/* Messages List */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Messages</h3>
            </div>
            
            <div className="h-96 overflow-y-auto p-6 space-y-4">
              {!messages || messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.author.id === session?.user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.author.id === session?.user?.id
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <div className="text-sm">{message.content}</div>
                      <div
                        className={`text-xs mt-1 ${
                          message.author.id === session?.user?.id ? "text-blue-100" : "text-gray-500"
                        }`}
                      >
                        {message.author.name} • {formatDate(message.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-6 border-t border-gray-200">
              <div className="flex space-x-4">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {sendingMessage ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "files" && (
          <div className="space-y-6">
            {/* Upload Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Files & Photos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="PHOTO_BEFORE">Before Photos</option>
                    <option value="PHOTO_DURING">During Photos</option>
                    <option value="PHOTO_AFTER">After Photos</option>
                    <option value="PHOTO_BID">Bid Photos</option>
                    <option value="PHOTO_INSPECTION">Inspection Photos</option>
                    <option value="DOCUMENT_PDF">PDF Documents</option>
                    <option value="DOCUMENT_PCR">PCR Documents</option>
                    <option value="OTHER">Other Files</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File
                  </label>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    accept="image/*,.pdf,.doc,.docx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                </div>
              </div>

              {uploadingFile && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm text-gray-600">Uploading...</span>
                </div>
              )}
            </div>

            {/* Files Display */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Files & Attachments ({files.length})
              </h3>
              
              {files.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p>No files uploaded yet.</p>
                  <p className="text-sm mt-2">Upload your first file using the form above.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group files by category */}
                  {["PHOTO_BEFORE", "PHOTO_DURING", "PHOTO_AFTER", "PHOTO_BID", "PHOTO_INSPECTION", "DOCUMENT_PDF", "DOCUMENT_PCR", "OTHER"].map(category => {
                    const categoryFiles = files.filter(file => file.category === category)
                    if (categoryFiles.length === 0) return null

                    return (
                      <div key={category} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">
                          {getCategoryDisplayName(category)} ({categoryFiles.length})
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {categoryFiles.map((file) => (
                            <div key={file.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                              {isImageFile(file.mimeType) ? (
                                <div 
                                  className="aspect-square bg-gray-100 rounded-lg mb-2 cursor-pointer overflow-hidden"
                                  onClick={() => setShowImageModal({
                                    url: file.url,
                                    title: `${getCategoryDisplayName(file.category)} - ${new Date(file.createdAt).toLocaleDateString()}`
                                  })}
                                >
                                  <img 
                                    src={file.url} 
                                    alt="Uploaded file"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                                  />
                                </div>
                              ) : (
                                <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                                  <FileText className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                              
                              <div className="space-y-1">
                                <p className="text-xs text-gray-500 truncate">
                                  {new Date(file.createdAt).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                  {file.mimeType}
                                </p>
                              </div>
                              
                              <div className="flex items-center justify-between mt-2 space-x-1">
                                {isImageFile(file.mimeType) ? (
                                  <button
                                    onClick={() => setShowImageModal({
                                      url: file.url,
                                      title: `${getCategoryDisplayName(file.category)} - ${new Date(file.createdAt).toLocaleDateString()}`
                                    })}
                                    className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                  >
                                    View
                                  </button>
                                ) : (
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-center"
                                  >
                                    Open
                                  </a>
                                )}
                                <button
                                  onClick={() => deleteFile(file.id)}
                                  className="flex-1 px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Image Modal */}
        {showImageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-medium">{showImageModal.title}</h3>
                <button
                  onClick={() => setShowImageModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-4">
                <img 
                  src={showImageModal.url} 
                  alt={showImageModal.title}
                  className="max-w-full max-h-[70vh] object-contain mx-auto"
                />
              </div>
              <div className="flex justify-end space-x-3 p-4 border-t">
                <a
                  href={showImageModal.url}
                  download
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Download
                </a>
                <button
                  onClick={() => setShowImageModal(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
