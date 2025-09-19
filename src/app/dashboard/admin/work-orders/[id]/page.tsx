"use client"

import { useState, useEffect, useRef } from "react"
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
  Plus as PlusIcon
} from "lucide-react"

import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Heading from "@tiptap/extension-heading"
import LinkExtension from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"

interface WorkOrder {
  id: string
  title: string
  description: string
  status: string
  serviceType: string
  addressLine1: string
  city: string
  state: string
  postalCode: string
  dueDate: string
  estimatedDate?: string
  createdAt: string
  updatedAt: string
  client: {
    id: string
    name: string
    company?: string
    email: string
    phone?: string
  }
  clientId: string
  assignedContractor?: {
    id: string
    name: string
    company?: string
    email: string
    phone?: string
  }
  assignedContractorId?: string
  assignedCoordinatorId?: string
  assignedProcessorId?: string
  assignedCoordinator?: {
    id: string
    name: string
    email: string
    phone?: string
    company?: string
  }
  assignedProcessor?: {
    id: string
    name: string
    email: string
    phone?: string
    company?: string
  }
  coordinator?: {
    id: string
    name: string
    email: string
  }
  _count: {
    messages: number
    files: number
  }
  messages: Message[]
  files: FileAttachment[]
  invoices: Invoice[]
}

interface Message {
  id: string
  content: string
  createdAt: string
  author: {
    name: string
    role: string
  }
}

interface FileAttachment {
  id: string
  url: string
  mimeType: string
  category: string
  createdAt?: string
  requirementId?: string | null
  taskId?: string
}

interface Task {
  id: string
  taskType: string
  taskName: string
  customTaskName?: string
  qty: number
  uom: string
  contractorPrice: number
  clientPrice: number
  comments: string
  violation: boolean
  damage: boolean
  hazards: boolean
  photoRequirements: PhotoRequirement[]
}

interface PhotoRequirement {
  id: string
  type: string
  label: string
  required: boolean
  uploaded: boolean
  url?: string
  fileId?: string
  uploads?: { id: string; url: string }[]
}

interface InvoiceItem {
  id: string
  item: string
  qty: number
  price: number
  total: number
  adjPrice: number
  discountPercent: number
  finalTotal: number
  comments: string
  flatFee: boolean
}

interface Invoice {
  id?: string
  invoiceNumber: string
  invoiceDate: string
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'
  sentToClientDate?: string
  completeDate?: string
  noCharge: boolean
  clientTotal: number
  notes: string
  items: InvoiceItem[]
}

export default function WorkOrderDetail() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("instructions")
  const [activeSubTab, setActiveSubTab] = useState("instructions")
  const [showPropertyHistory, setShowPropertyHistory] = useState(false)
  const [showCreateBid, setShowCreateBid] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [instructions, setInstructions] = useState("")
  const [savingTasks, setSavingTasks] = useState(false)
  const [savingInstructions, setSavingInstructions] = useState(false)
  const [taskMessages, setTaskMessages] = useState<{[key: string]: any[]}>({})
  const [bidMessages, setBidMessages] = useState<{[key: string]: any[]}>({})
  const [showTaskMessageModal, setShowTaskMessageModal] = useState<{taskId: string, taskName: string} | null>(null)
  const [showBidMessageModal, setShowBidMessageModal] = useState<{bidId: string, bidName: string} | null>(null)
  const [loadingMessageCounts, setLoadingMessageCounts] = useState<{[taskId: string]: boolean}>({})
  const [newTaskMessage, setNewTaskMessage] = useState("")
  const [newBidMessage, setNewBidMessage] = useState("")
  const [users, setUsers] = useState<any[]>([])
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [assignmentData, setAssignmentData] = useState({
    assignedContractorId: "",
    assignedCoordinatorId: "",
    assignedProcessorId: ""
  })
  const [invoice, setInvoice] = useState<Invoice>({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    status: 'DRAFT',
    noCharge: false,
    clientTotal: 0,
    notes: '',
    items: []
  })
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [currentUpload, setCurrentUpload] = useState<{ taskId: string; requirementId: string } | null>(null)
  const [lightbox, setLightbox] = useState<{ open: boolean; images: { id: string; url: string }[]; index: number }>(
    { open: false, images: [], index: 0 }
  )
  const [newTask, setNewTask] = useState<Partial<Task>>({
    taskType: "",
    taskName: "",
    qty: 1,
    uom: "",
    contractorPrice: 0,
    clientPrice: 0,
    comments: "",
    violation: false,
    damage: false,
    hazards: false,
    photoRequirements: []
  })
  const editorRef = useRef<HTMLDivElement | null>(null)
  const lastRangeRef = useRef<Range | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Heading.configure({ levels: [1, 2, 3] }),
      LinkExtension.configure({ openOnClick: false }),
      Image
    ],
    content: instructions || "<p></p>",
    onUpdate: ({ editor }) => {
      setInstructions(editor.getHTML())
    },
    immediatelyRender: false
  })

  useEffect(() => {
    // When a work order loads, sync its description into the editor once
    if (editor && workOrder) {
      editor.commands.setContent(workOrder.description || "<p></p>")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, workOrder?.id])

  const saveSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        lastRangeRef.current = range
      }
    }
  }

  const restoreSelection = () => {
    const selection = window.getSelection()
    if (selection && lastRangeRef.current) {
      selection.removeAllRanges()
      selection.addRange(lastRangeRef.current)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchWorkOrder()
      fetchTasks()
      fetchInvoice()
      fetchUsers()
    }
  }, [params.id])

  useEffect(() => {
    if (workOrder) {
      setAssignmentData({
        assignedContractorId: workOrder.assignedContractorId || "",
        assignedCoordinatorId: workOrder.assignedCoordinatorId || "",
        assignedProcessorId: workOrder.assignedProcessorId || ""
      })
    }
  }, [workOrder])

  const mergeFilesIntoTasks = (files: FileAttachment[], baseTasks: Task[]): Task[] => {
    if (!files || files.length === 0) return baseTasks
    // Build helper to find requirement by category when requirementId is missing
    const findRequirementByCategory = (task: Task, category: string): PhotoRequirement | undefined => {
      const cat = String(category || "").toUpperCase()
      const map: Record<string, string> = {
        "PHOTO_BEFORE": "BEFORE",
        "PHOTO_DURING": "DURING",
        "PHOTO_AFTER": "AFTER",
        "PHOTO_BID": "BID",
        "PHOTO_INSPECTION": "INSPECTION",
      }
      const desired = map[cat]
      if (!desired) return undefined
      return task.photoRequirements.find(r => r.type === desired)
    }

    // Copy tasks to mutate safely
    const nextTasks = baseTasks.map(t => ({ ...t, photoRequirements: t.photoRequirements.map(r => ({ ...r, uploads: r.uploads || [] })) }))

    // Track processed files to prevent duplicates within the same requirement
    const processedFiles = new Set<string>()
    
    console.log("Merging files into tasks:", { filesCount: files.length, tasksCount: nextTasks.length })
    
    for (const f of files) {
      console.log("Processing file:", { id: f.id, taskId: f.taskId, requirementId: f.requirementId, category: f.category, url: f.url })
      
      let applied = false
      for (const t of nextTasks) {
        // 1) Try by requirementId (most specific)
        if (f.requirementId) {
          const req = t.photoRequirements.find(r => r.id === f.requirementId)
          console.log(`  Checking requirementId ${f.requirementId} in task ${t.taskName}:`, { found: !!req, alreadyHasFile: req?.uploads?.some(u => u.id === f.id) })
          if (req && !req.uploads?.some(u => u.id === f.id)) {
            req.uploads = [...(req.uploads || []), { id: f.id, url: f.url }]
            req.uploaded = true
            if (!req.url) req.url = f.url
            applied = true
            processedFiles.add(f.id)
            console.log(`  ✅ Applied file ${f.id} to requirement ${req.id}`)
            break
          }
        }
        // 2) Try by taskId + category (for files linked to specific tasks)
        if (!applied && f.taskId && f.taskId === t.id && f.category) {
          const reqByCat = findRequirementByCategory(t, f.category)
          console.log(`  Checking taskId ${f.taskId} + category ${f.category} in task ${t.taskName}:`, { found: !!reqByCat, alreadyHasFile: reqByCat?.uploads?.some(u => u.id === f.id) })
          if (reqByCat && !reqByCat.uploads?.some(u => u.id === f.id)) {
            reqByCat.uploads = [...(reqByCat.uploads || []), { id: f.id, url: f.url }]
            reqByCat.uploaded = true
            if (!reqByCat.url) reqByCat.url = f.url
            applied = true
            processedFiles.add(f.id)
            console.log(`  ✅ Applied file ${f.id} to requirement by category ${reqByCat.id}`)
            break
          }
        }
        // 3) Fallback removed to prevent duplicates - only use specific matching
      }
    }

    console.log("Final tasks with files:", nextTasks.map(t => ({
      taskName: t.taskName,
      requirements: t.photoRequirements.map(r => ({
        id: r.id,
        label: r.label,
        uploadsCount: r.uploads?.length || 0
      }))
    })))

    return nextTasks
  }

  const fetchWorkOrder = async () => {
    try {
      const response = await fetch(`/api/work-orders/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setWorkOrder(data)
        setInstructions(data.description || "")
        // If tasks present already, merge files now
        setTasks(prev => mergeFilesIntoTasks(data.files, prev))
      }
    } catch (error) {
      console.error("Error fetching work order:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/work-orders/${params.id}/tasks`)
      if (response.ok) {
        const data = await response.json()
        if (data.tasks && data.tasks.length > 0) {
          const next = data.tasks as Task[]
          // Ensure all tasks have photo requirements
          const tasksWithRequirements = next.map(task => {
            const hasRequirements = task.photoRequirements && task.photoRequirements.length > 0
            // If taskType is empty or undefined, treat bid tasks as "Bid" type
            const effectiveTaskType = task.taskType || (task.taskName && task.taskName.includes("(Bid)") ? "Bid" : task.taskType)
            const newRequirements = generatePhotoRequirements(effectiveTaskType, task.id)
            console.log(`Task ${task.taskName} (${task.taskType} -> ${effectiveTaskType}): hasRequirements=${hasRequirements}, newRequirements=${newRequirements.length}`)
            return {
              ...task,
              taskType: effectiveTaskType,
              photoRequirements: hasRequirements ? task.photoRequirements : newRequirements
            }
          })
          const finalTasks = workOrder ? mergeFilesIntoTasks((workOrder as any).files || [], tasksWithRequirements) : tasksWithRequirements
          setTasks(finalTasks)
          
          // Fetch messages for all tasks to show correct message counts
          for (const task of finalTasks) {
            if (task.id && !taskMessages[task.id]) {
              await fetchTaskMessages(task.id)
            }
          }
        } else {
          // If no tasks exist, start with an empty list
          const empty: Task[] = []
          setTasks(workOrder ? mergeFilesIntoTasks((workOrder as any).files || [], empty) : empty)
        }
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
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

  const handleSaveInstructions = async () => {
    setSavingInstructions(true)
    try {
      console.log("Saving instructions:", instructions)
      const response = await fetch(`/api/work-orders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: instructions })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log("Instructions saved successfully:", result)
        alert("Instructions saved successfully!")
        // Refresh work order to get updated data
        fetchWorkOrder()
      } else {
        const errorData = await response.json()
        console.error("Failed to save instructions:", errorData)
        alert(`Failed to save instructions: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Error saving instructions:", error)
      alert("Error saving instructions. Please try again.")
    } finally {
      setSavingInstructions(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderId: params.id,
          content: newMessage
        })
      })
      
      if (response.ok) {
        setNewMessage("")
        fetchWorkOrder() // Refresh to get new message
      }
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return

    try {
      const response = await fetch(`/api/upload/${photoId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Refresh work order to get updated files
        fetchWorkOrder()
      } else {
        alert('Failed to delete photo')
      }
    } catch (error) {
      console.error("Error deleting photo:", error)
      alert('Error deleting photo')
    }
  }

  const handleDeleteAllPhotos = async (requirement: PhotoRequirement) => {
    if (!requirement.uploads || requirement.uploads.length === 0) return
    if (!confirm(`Are you sure you want to delete all ${requirement.uploads.length} photos in ${requirement.label}?`)) return

    try {
      const deletePromises = requirement.uploads.map(upload => 
        fetch(`/api/upload/${upload.id}`, { method: 'DELETE' })
      )
      
      await Promise.all(deletePromises)
      // Refresh work order to get updated files
      fetchWorkOrder()
    } catch (error) {
      console.error("Error deleting photos:", error)
      alert('Error deleting photos')
    }
  }

  const addInvoiceItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      item: '',
      qty: 1,
      price: 0,
      total: 0,
      adjPrice: 0,
      discountPercent: 0,
      finalTotal: 0,
      comments: '',
      flatFee: false
    }
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }

  const updateInvoiceItem = (itemId: string, field: keyof InvoiceItem, value: any) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value }
          
          // Recalculate totals
          if (field === 'qty' || field === 'price') {
            updatedItem.total = updatedItem.qty * updatedItem.price
          }
          
          if (field === 'discountPercent') {
            updatedItem.finalTotal = updatedItem.total * (1 - updatedItem.discountPercent / 100)
          } else if (field === 'adjPrice') {
            updatedItem.finalTotal = updatedItem.adjPrice || updatedItem.total * (1 - updatedItem.discountPercent / 100)
          } else if (field === 'qty' || field === 'price') {
            updatedItem.finalTotal = updatedItem.total * (1 - updatedItem.discountPercent / 100)
          }
          
          return updatedItem
        }
        return item
      })
    }))
  }

  const deleteInvoiceItem = (itemId: string) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }))
  }

  const calculateInvoiceTotal = () => {
    return invoice.items.reduce((sum, item) => sum + item.finalTotal, 0)
  }

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/work-orders/${params.id}/invoice`)
      if (response.ok) {
        const invoiceData = await response.json()
        if (invoiceData) {
          setInvoice({
            id: invoiceData.id,
            invoiceNumber: invoiceData.invoiceNumber || '',
            invoiceDate: invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            status: invoiceData.status || 'DRAFT',
            sentToClientDate: invoiceData.sentToClientDate ? new Date(invoiceData.sentToClientDate).toISOString().split('T')[0] : '',
            completeDate: invoiceData.completeDate ? new Date(invoiceData.completeDate).toISOString().split('T')[0] : '',
            noCharge: invoiceData.noCharge || false,
            clientTotal: invoiceData.clientTotal || 0,
            notes: invoiceData.notes || '',
            items: invoiceData.items || []
          })
        }
      }
    } catch (error) {
      console.error("Error fetching invoice:", error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const usersData = await response.json()
        setUsers(usersData)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const handleAssignmentChange = (field: string, value: string) => {
    setAssignmentData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveAssignments = async () => {
    try {
      const response = await fetch(`/api/work-orders/${params.id}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      })

      if (response.ok) {
        const updatedWorkOrder = await response.json()
        setWorkOrder(updatedWorkOrder)
        setShowAssignmentModal(false)
        alert("Assignments updated successfully!")
      } else {
        alert("Failed to update assignments")
      }
    } catch (error) {
      console.error("Error saving assignments:", error)
      alert("Error saving assignments")
    }
  }

  const saveInvoice = async () => {
    if (!workOrder) return
    
    try {
      const invoiceData = {
        ...invoice,
        clientId: workOrder.clientId
      }
      
      console.log("Saving invoice data:", invoiceData)
      
      const response = await fetch(`/api/work-orders/${params.id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData)
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log("Invoice saved successfully:", result)
        alert("Invoice saved successfully!")
        fetchInvoice() // Refresh invoice data
      } else {
        const errorData = await response.json()
        console.error("Failed to save invoice:", errorData)
        alert(`Failed to save invoice: ${errorData.error || 'Unknown error'}${errorData.details ? ` - ${errorData.details}` : ''}`)
      }
    } catch (error) {
      console.error("Error saving invoice:", error)
      alert("Error saving invoice. Please try again.")
    }
  }

  const fetchTaskMessages = async (taskId: string) => {
    try {
      setLoadingMessageCounts(prev => ({ ...prev, [taskId]: true }))
      const response = await fetch(`/api/work-orders/${params.id}/messages?taskId=${taskId}`)
      if (response.ok) {
        const data = await response.json()
        setTaskMessages(prev => ({
          ...prev,
          [taskId]: data.messages
        }))
      }
    } catch (error) {
      console.error("Error fetching task messages:", error)
    } finally {
      setLoadingMessageCounts(prev => ({ ...prev, [taskId]: false }))
    }
  }

  const fetchBidMessages = async (bidId: string) => {
    try {
      const response = await fetch(`/api/work-orders/${params.id}/messages?bidId=${bidId}`)
      if (response.ok) {
        const data = await response.json()
        setBidMessages(prev => ({
          ...prev,
          [bidId]: data.messages
        }))
      }
    } catch (error) {
      console.error("Error fetching bid messages:", error)
    }
  }

  const sendTaskMessage = async (taskId: string) => {
    if (!newTaskMessage.trim()) return

    try {
      const response = await fetch(`/api/work-orders/${params.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newTaskMessage,
          taskId: taskId
        })
      })

      if (response.ok) {
        setNewTaskMessage("")
        await fetchTaskMessages(taskId) // Refresh messages
      } else {
        const errorData = await response.json()
        console.error("Failed to send task message:", errorData)
        alert(`Failed to send message: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Error sending task message:", error)
      alert("Error sending message. Please try again.")
    }
  }

  const sendBidMessage = async (bidId: string) => {
    if (!newBidMessage.trim()) return

    try {
      const response = await fetch(`/api/work-orders/${params.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newBidMessage,
          bidId: bidId
        })
      })

      if (response.ok) {
        setNewBidMessage("")
        fetchBidMessages(bidId) // Refresh messages
      } else {
        const errorData = await response.json()
        console.error("Failed to send bid message:", errorData)
        alert(`Failed to send message: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Error sending bid message:", error)
      alert("Error sending message. Please try again.")
    }
  }

  const getTaskDisplayName = (task: Task): string => {
    if (task.taskName === "Other" && task.customTaskName) {
      return task.customTaskName
    }
    return task.taskName
  }

  const generatePhotoRequirements = (taskType: string, taskId?: string): PhotoRequirement[] => {
    // Use taskId to generate consistent IDs, or fallback to timestamp
    const baseId = taskId || Date.now().toString()
    
    switch (taskType) {
      case "Completion":
        return [
          { id: `${baseId}-before`, type: "BEFORE", label: "Before Photos", required: true, uploaded: false, uploads: [] },
          { id: `${baseId}-during`, type: "DURING", label: "During Photos", required: true, uploaded: false, uploads: [] },
          { id: `${baseId}-after`, type: "AFTER", label: "After Photos", required: true, uploaded: false, uploads: [] }
        ]
      case "Bid":
        return [
          { id: `${baseId}-bid`, type: "BID", label: "Bid Photos", required: true, uploaded: false, uploads: [] }
        ]
      case "Inspection":
        return [
          { id: `${baseId}-inspection`, type: "INSPECTION", label: "Inspection Photos", required: true, uploaded: false, uploads: [] }
        ]
      default:
        return []
    }
  }

  const handleAddTask = () => {
    const taskId = Date.now().toString()
    const photoRequirements = generatePhotoRequirements(newTask.taskType || "", taskId)
    
    const task: Task = {
      id: taskId,
      ...newTask,
      qty: newTask.qty || 1,
      contractorPrice: newTask.contractorPrice || 0,
      clientPrice: newTask.clientPrice || 0,
      photoRequirements
    } as Task
    
    setTasks([...tasks, task])
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
      hazards: false,
      photoRequirements: []
    })
  }

  const handleAddBidItem = () => {
    const taskId = Date.now().toString()
    const bidItem: Task = {
      id: taskId,
      taskType: "Bid",
      taskName: "",
      qty: 1,
      uom: "EACH",
      contractorPrice: 0,
      clientPrice: 0,
      comments: "",
      violation: false,
      damage: false,
      hazards: false,
      photoRequirements: []
    }
    
    setTasks([...tasks, bidItem])
  }

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId))
  }

  const handleSaveTasks = async () => {
    // Validate bid items before saving
    const bidTasks = tasks.filter(task => task.taskType === "Bid")
    const invalidBidTasks = bidTasks.filter(task => {
      // Check if task name is valid
      const displayName = getTaskDisplayName(task)
      const hasValidTaskName = displayName && displayName.trim() !== "" && displayName !== "Select Task..."
      
      return !hasValidTaskName || task.qty <= 0 || task.clientPrice <= 0
    })
    
    if (invalidBidTasks.length > 0) {
      alert("Please complete all bid items:\n- Select a valid task or enter custom task name\n- Enter quantity > 0\n- Enter client price > 0")
      return
    }
    
    setSavingTasks(true)
    try {
      console.log("Saving tasks:", tasks)
      
      const response = await fetch(`/api/work-orders/${params.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save tasks')
      }
      
      const result = await response.json()
      console.log("Tasks saved:", result)
      
      alert("Tasks saved successfully!")
    } catch (error) {
      console.error("Error saving tasks:", error)
      alert("Error saving tasks. Please try again.")
    } finally {
      setSavingTasks(false)
    }
  }

  const calculateTotals = () => {
    const contractorTotal = tasks.reduce((sum, task) => sum + (task.contractorPrice * task.qty), 0)
    const clientTotal = tasks.reduce((sum, task) => sum + (task.clientPrice * task.qty), 0)
    return { contractorTotal, clientTotal }
  }

  const calculateBidTotals = () => {
    const bidTasks = tasks.filter(task => task.taskType === "Bid")
    const contractorTotal = bidTasks.reduce((sum, task) => sum + (task.contractorPrice * task.qty), 0)
    const clientTotal = bidTasks.reduce((sum, task) => sum + (task.clientPrice * task.qty), 0)
    return { contractorTotal, clientTotal, count: bidTasks.length }
  }

  const { contractorTotal, clientTotal } = calculateTotals()
  const { contractorTotal: bidContractorTotal, clientTotal: bidClientTotal, count: bidCount } = calculateBidTotals()

  const handleExec = (command: string, value: string | null = null) => {
    try {
      // Restore previous selection so toolbar acts on user's selected text
      restoreSelection()
      if (editorRef.current) {
        editorRef.current.focus()
      }
      if (command === "formatBlock" && value) {
        document.execCommand("formatBlock", false, value)
      } else {
        document.execCommand(command, false, value || undefined)
      }
      if (editorRef.current) {
        setInstructions(editorRef.current.innerHTML)
      }
      // Save updated selection after command
      saveSelection()
    } catch (e) {
      console.error("execCommand error", e)
    }
  }

  const handleCreateLink = () => {
    const url = window.prompt("Enter URL")
    if (!url) return
    handleExec("createLink", url)
  }

  const handleInsertImage = () => {
    const url = window.prompt("Enter image URL")
    if (!url) return
    handleExec("insertImage", url)
  }

  const handleUploadClick = (taskId: string, requirementId: string) => {
    setCurrentUpload({ taskId, requirementId })
    if (fileInputRef.current) fileInputRef.current.value = ""
    fileInputRef.current?.click()
  }

  const uploadFilesForRequirement = async (taskId: string, requirementId: string, files: File[]) => {
    const targetTask = tasks.find(t => t.id === taskId)
    const targetReq = targetTask?.photoRequirements.find(r => r.id === requirementId)
    if (!targetTask || !targetReq || files.length === 0) return

    try {
      const results = await Promise.all(files.map(async (file) => {
        const formData = new FormData()
        formData.append("file", file as unknown as Blob)
        formData.append("workOrderId", String(params.id))
        formData.append("category", targetReq.type)
        formData.append("taskId", taskId)
        formData.append("requirementId", requirementId)
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        if (!res.ok) {
          let errBody: any = {}
          try { errBody = await res.json() } catch {}
          const msg = errBody?.error || errBody?.details || `Upload failed (${res.status})`
          throw new Error(msg)
        }
        return res.json()
      }))

      const newItems = results.map((data: any) => ({ id: data.fileAttachment?.id || `${Date.now()}`, url: data.fileAttachment?.url }))

      const updated = tasks.map(t => {
        if (t.id !== targetTask.id) return t
        return {
          ...t,
          photoRequirements: t.photoRequirements.map(r => {
            if (r.id !== targetReq.id) return r
            const newUploads = [...(r.uploads || []), ...newItems.filter(Boolean)]
            return {
              ...r,
              uploaded: newUploads.length > 0,
              url: newUploads[0]?.url || r.url,
              uploads: newUploads
            }
          })
        }
      })
      setTasks(updated)
      // Re-fetch to hydrate from DB (ensures requirementId linkage persists across reload)
      fetchWorkOrder()
      alert(`${newItems.length} file(s) uploaded successfully`)
    } catch (err) {
      console.error("Upload error", err)
      alert((err as Error).message || "Failed to upload photo(s)")
    }
  }

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!currentUpload || files.length === 0) return
    await uploadFilesForRequirement(currentUpload.taskId, currentUpload.requirementId, files)
    setCurrentUpload(null)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, taskId: string, requirementId: string) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files || [])
    const imageFiles = files.filter(f => f.type.startsWith("image/"))
    if (imageFiles.length === 0) return
    await uploadFilesForRequirement(taskId, requirementId, imageFiles)
  }

  const allowDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const openLightbox = (images: { id: string; url: string }[], index: number) => {
    setLightbox({ open: true, images, index })
  }
  const closeLightbox = () => setLightbox(prev => ({ ...prev, open: false }))
  const prevLightbox = () => setLightbox(prev => ({ ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length }))
  const nextLightbox = () => setLightbox(prev => ({ ...prev, index: (prev.index + 1) % prev.images.length }))

  useEffect(() => {
    if (!lightbox.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        closeLightbox()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        prevLightbox()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        nextLightbox()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightbox.open])

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
          The work order you're looking for doesn't exist or you don't have permission to view it.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="bg-gray-800 text-white p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <select className="bg-gray-700 text-white px-3 py-1 rounded border-0">
              <option>Assigned</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
            <span className="bg-orange-500 text-white px-3 py-1 rounded text-sm font-medium">
              Assigned
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center">
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center">
              <Printer className="h-4 w-4 mr-1" />
              Print
            </button>
            <Link
              href={`/dashboard/admin/work-orders/${params.id}/edit`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Link>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              Bid/Invoice
            </button>
            <button 
              onClick={() => setShowCreateBid(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Create Bid
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              Property History
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              Map
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center">
              <MessageSquare className="h-4 w-4 mr-1" />
              Message
            </button>
          </div>
          
          <div>
            <Link href="/dashboard/admin/support" className="text-blue-300 hover:text-blue-200">
              Need Help?
            </Link>
          </div>
        </div>
      </div>

      {/* Work Order Summary */}
      <div className="bg-gray-100 p-4 rounded-lg">
        {/* Main Tabs */}
        <div className="flex space-x-1 mb-4">
          <button 
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
              activeTab === "ipl" ? "bg-white text-gray-900" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab("ipl")}
          >
            IPL # {workOrder.id}
          </button>
          <button 
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
              activeTab === "instructions" ? "bg-white text-gray-900" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab("instructions")}
          >
            Instructions
          </button>
          <button 
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
              activeTab === "office-results" ? "bg-white text-gray-900" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab("office-results")}
          >
            Office Results
          </button>
          <button 
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
              activeTab === "field-results" ? "bg-white text-gray-900" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab("field-results")}
          >
            Field Results
          </button>
          <button 
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
              activeTab === "invoice" ? "bg-white text-gray-900" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab("invoice")}
          >
            Invoice
          </button>
          <button 
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
              activeTab === "photos" ? "bg-white text-gray-900" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab("photos")}
          >
            Photos({workOrder._count.files})
          </button>
          <button 
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
              activeTab === "messages" ? "bg-white text-gray-900" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab("messages")}
          >
            Messages({workOrder._count.messages})
          </button>
          <button 
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
              activeTab === "property-info" ? "bg-white text-gray-900" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab("property-info")}
          >
            Property Info
          </button>
          <button 
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
              activeTab === "client-sync" ? "bg-white text-gray-900" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab("client-sync")}
          >
            Client Sync
          </button>
          <button 
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
              activeTab === "assignments" ? "bg-white text-gray-900" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab("assignments")}
          >
            Assignments
          </button>
        </div>

        {/* Work Order Details */}
        <div className="bg-white p-4 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Work Type:</span>
              <div className="text-gray-900">{workOrder.serviceType}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Work Order No:</span>
              <div className="text-gray-900">{workOrder.id}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Address:</span>
              <div className="text-gray-900">{workOrder.addressLine1}</div>
              <div className="text-gray-600">{workOrder.city}, {workOrder.state} {workOrder.postalCode}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Client:</span>
              <div className="text-gray-900">{workOrder.client.name}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Contractor:</span>
              <div className="text-gray-900">{workOrder.assignedContractor?.name || "Unassigned"}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Coordinator:</span>
              <div className="text-gray-900">{workOrder.coordinator?.name || "Unassigned"}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Due Date:</span>
              <div className="text-gray-900">{new Date(workOrder.dueDate).toLocaleDateString()}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Estimated Date:</span>
              <div className="text-gray-900 flex items-center">
                {workOrder.estimatedDate ? new Date(workOrder.estimatedDate).toLocaleDateString() : "Not set"}
                <Calendar className="h-4 w-4 ml-1 text-gray-400" />
                <FileText className="h-4 w-4 ml-1 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Assignments Tab Content */}
        {activeTab === "assignments" && (
          <div className="bg-white p-6 rounded-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Work Order Assignments</h3>
              <button
                onClick={() => setShowAssignmentModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Assign Users
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Contractor Assignment */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Contractor</h4>
                {workOrder?.assignedContractor ? (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Name:</span> {workOrder.assignedContractor.name}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Email:</span> {workOrder.assignedContractor.email}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Phone:</span> {workOrder.assignedContractor.phone}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Company:</span> {workOrder.assignedContractor.company}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No contractor assigned</div>
                )}
              </div>

              {/* Coordinator Assignment */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Coordinator</h4>
                {workOrder?.assignedCoordinator ? (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Name:</span> {workOrder.assignedCoordinator.name}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Email:</span> {workOrder.assignedCoordinator.email}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Phone:</span> {workOrder.assignedCoordinator.phone}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Company:</span> {workOrder.assignedCoordinator.company}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No coordinator assigned</div>
                )}
              </div>

              {/* Processor Assignment */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Processor</h4>
                {workOrder?.assignedProcessor ? (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Name:</span> {workOrder.assignedProcessor.name}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Email:</span> {workOrder.assignedProcessor.email}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Phone:</span> {workOrder.assignedProcessor.phone}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Company:</span> {workOrder.assignedProcessor.company}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No processor assigned</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Work Order Details Section */}
        <div className="mt-4">
          <div 
            className="bg-gray-200 p-3 cursor-pointer flex items-center justify-between"
            onClick={() => setShowPropertyHistory(!showPropertyHistory)}
          >
            <h3 className="font-medium text-gray-900">Work Order Details</h3>
            {showPropertyHistory ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
          
          {showPropertyHistory && (
            <div className="bg-white border-t">
              {/* Sub Tabs */}
              <div className="flex space-x-1 p-4 border-b">
                <button 
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    activeSubTab === "instructions" ? "bg-blue-100 text-blue-800" : "text-gray-600 hover:text-gray-800"
                  }`}
                  onClick={() => setActiveSubTab("instructions")}
                >
                  Instructions
                </button>
                <button 
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    activeSubTab === "task" ? "bg-blue-100 text-blue-800" : "text-gray-600 hover:text-gray-800"
                  }`}
                  onClick={() => setActiveSubTab("task")}
                >
                  Task
                </button>
                <button 
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    activeSubTab === "photos" ? "bg-blue-100 text-blue-800" : "text-gray-600 hover:text-gray-800"
                  }`}
                  onClick={() => setActiveSubTab("photos")}
                >
                  Photos
                </button>
                <button 
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    activeSubTab === "bid" ? "bg-blue-100 text-blue-800" : "text-gray-600 hover:text-gray-800"
                  }`}
                  onClick={() => setActiveSubTab("bid")}
                >
                  Bid
                </button>
                <button 
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    activeSubTab === "invoice" ? "bg-blue-100 text-blue-800" : "text-gray-600 hover:text-gray-800"
                  }`}
                  onClick={() => setActiveSubTab("invoice")}
                >
                  Invoice
                </button>
                <button 
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    activeSubTab === "comments" ? "bg-blue-100 text-blue-800" : "text-gray-600 hover:text-gray-800"
                  }`}
                  onClick={() => setActiveSubTab("comments")}
                >
                  Comments
                </button>
                <button 
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    activeSubTab === "correction" ? "bg-blue-100 text-blue-800" : "text-gray-600 hover:text-gray-800"
                  }`}
                  onClick={() => setActiveSubTab("correction")}
                >
                  Information/Correction Needed
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {activeSubTab === "instructions" && (
                  <div>
                    <div className="mb-4">
                      <div className="border border-gray-300 rounded-lg">
                        {/* TipTap Toolbar */}
                        <div className="border-b border-gray-300 p-2 flex items-center space-x-2">
                          <button className="p-1 hover:bg-gray-100 rounded" onClick={() => editor?.chain().focus().toggleBold().run()}>B</button>
                          <button className="p-1 hover:bg-gray-100 rounded" onClick={() => editor?.chain().focus().toggleItalic().run()}>I</button>
                          <button 
                            className="p-1 hover:bg-gray-100 rounded text-sm font-bold" 
                            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                            title="Heading 1"
                          >
                            H1
                          </button>
                          <button 
                            className="p-1 hover:bg-gray-100 rounded text-sm font-bold" 
                            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                            title="Heading 2"
                          >
                            H2
                          </button>
                          <button 
                            className="p-1 hover:bg-gray-100 rounded text-sm font-bold" 
                            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                            title="Heading 3"
                          >
                            H3
                          </button>
                          <button 
                            className="p-1 hover:bg-gray-100 rounded text-sm" 
                            onClick={() => editor?.chain().focus().setParagraph().run()}
                            title="Paragraph"
                          >
                            P
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded" onClick={() => editor?.chain().focus().toggleBulletList().run()}>•</button>
                          <button className="p-1 hover:bg-gray-100 rounded" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1.</button>
                          <button className="p-1 hover:bg-gray-100 rounded" onClick={() => {
                            const url = window.prompt("Enter URL")
                            if (!url) return
                            editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
                          }}>🔗</button>
                          <button className="p-1 hover:bg-gray-100 rounded" onClick={() => editor?.chain().focus().unsetLink().run()}>❌</button>
                          <button className="p-1 hover:bg-gray-100 rounded" onClick={() => {
                            const url = window.prompt("Enter image URL")
                            if (!url) return
                            editor?.chain().focus().setImage({ src: url }).run()
                          }}>🖼️</button>
                        </div>
                        {/* Editable Area */}
                        <div className="w-full p-4 min-h-[200px]">
                          {editor && (
                            <EditorContent 
                              editor={editor} 
                              className="prose prose-sm max-w-none min-h-[200px] focus:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:resize-y [&_.ProseMirror]:overflow-auto [&_.ProseMirror]:p-4 [&_.ProseMirror]:border-0 [&_.ProseMirror]:focus:outline-none [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_p]:mb-2 [&_.ProseMirror_ul]:mb-2 [&_.ProseMirror_ol]:mb-2 [&_.ProseMirror_li]:mb-1"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleSaveInstructions}
                      disabled={savingInstructions}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded flex items-center"
                    >
                      {savingInstructions ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </button>
                  </div>
                )}

                {activeSubTab === "task" && (
                  <div>
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
                          {tasks.map((task) => (
                            <tr key={task.id}>
                              <td className="border border-gray-300 px-3 py-2">
                                <select 
                                  value={task.taskType}
                                  onChange={(e) => {
                                    const updatedTasks = tasks.map(t => 
                                      t.id === task.id 
                                        ? { ...t, taskType: e.target.value, photoRequirements: generatePhotoRequirements(e.target.value) }
                                        : t
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
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <select 
                                  value={task.taskName}
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
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <input 
                                  type="number" 
                                  value={task.qty}
                                  onChange={(e) => {
                                    const updatedTasks = tasks.map(t => 
                                      t.id === task.id ? { ...t, qty: parseInt(e.target.value) || 1 } : t
                                    )
                                    setTasks(updatedTasks)
                                  }}
                                  className="w-full border-0 text-sm"
                                />
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
                                  <input 
                                    type="number" 
                                    value={task.contractorPrice}
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
                                    value={task.contractorPrice * task.qty}
                                    className="w-full border-0 text-sm"
                                    placeholder="$ 0.00"
                                    readOnly
                                  />
                                </div>
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <div className="space-y-1">
                                  <input 
                                    type="number" 
                                    value={task.clientPrice}
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
                                    value={task.clientPrice * task.qty}
                                    className="w-full border-0 text-sm"
                                    placeholder="$ 0.00"
                                    readOnly
                                  />
                                </div>
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <textarea 
                                  value={task.comments}
                                  onChange={(e) => {
                                    const updatedTasks = tasks.map(t => 
                                      t.id === task.id ? { ...t, comments: e.target.value } : t
                                    )
                                    setTasks(updatedTasks)
                                  }}
                                  className="w-full border-0 text-sm resize-y min-h-24"
                                  rows={4}
                                />
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <div className="flex items-center space-x-1">
                                  <button className="p-1 hover:bg-gray-100 rounded">
                                    <Copy className="h-4 w-4" />
                                  </button>
                                  <button className="p-1 hover:bg-gray-100 rounded">
                                    <ChevronUp className="h-4 w-4" />
                                  </button>
                                  <button className="p-1 hover:bg-gray-100 rounded">
                                    <ChevronDown className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-1 hover:bg-gray-100 rounded text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
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
                              ${contractorTotal.toFixed(2)}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                              ${clientTotal.toFixed(2)}
                            </td>
                            <td colSpan={2} className="border border-gray-300 px-3 py-2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Photo Requirements Section */}
                    {false && tasks.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Photo Requirements</h4>
                        <div className="space-y-4">
                          {tasks.map((task) => (
                            <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-medium text-gray-900">
                                  {getTaskDisplayName(task)} ({task.taskType})
                                </h5>
                                <span className="text-sm text-gray-500">
                                  {task.photoRequirements.filter(req => req.uploaded).length} / {task.photoRequirements.length} uploaded
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {task.photoRequirements.map((requirement) => (
                                  <div 
                                    key={requirement.id}
                                    className={`p-3 rounded-lg border-2 ${
                                      requirement.uploaded 
                                        ? 'border-green-200 bg-green-50' 
                                        : 'border-gray-200 bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="font-medium text-sm text-gray-900">
                                          {requirement.label}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {requirement.required ? 'Required' : 'Optional'}
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {requirement.uploaded ? (
                                          <CheckCircle className="h-5 w-5 text-green-500" />
                                        ) : (
                                          <Camera className="h-5 w-5 text-gray-400" />
                                        )}
                                        <button className="text-blue-600 hover:text-blue-500 text-sm">
                                          {requirement.uploaded ? 'View' : 'Upload'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={handleAddTask}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Task
                      </button>
                      <button 
                        onClick={handleSaveTasks}
                        disabled={savingTasks}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded flex items-center"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {savingTasks ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                )}

                {activeSubTab === "photos" && (
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelected} />
                    {tasks.length === 0 ? (
                      <div className="text-sm text-gray-600">No tasks yet. Create a task to see photo requirements.</div>
                    ) : (
                      <div className="space-y-6">
                        {/* Download all */}
                        <div className="flex justify-end">
                          <a
                            href={`/api/work-orders/${params.id}/photos/download?scope=all`}
                            className="text-sm text-blue-600 hover:text-blue-500"
                          >
                            Download All (ZIP)
                          </a>
                        </div>
                        {tasks.map((task) => (
                          <div key={task.id} className="border border-gray-200 rounded-lg">
                            <div className="px-4 py-3 border-b flex items-center justify-between">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{getTaskDisplayName(task)} <span className="text-gray-500 font-normal">({task.taskType})</span></div>
                                <div className="text-xs text-gray-500">{task.photoRequirements.filter(r => (r.uploads && r.uploads.length > 0)).length} / {task.photoRequirements.length} uploaded</div>
                              </div>
                              <a
                                href={`/api/work-orders/${params.id}/photos/download?scope=task&taskId=${task.id}`}
                                className="text-sm text-blue-600 hover:text-blue-500"
                              >
                                Download Task (ZIP)
                              </a>
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                              {task.photoRequirements.map((requirement) => (
                                <div 
                                  key={requirement.id}
                                  className={`p-3 rounded-lg border-2 ${
                                    (requirement.uploads && requirement.uploads.length > 0) 
                                      ? 'border-green-200 bg-green-50' 
                                      : 'border-dashed border-gray-300 bg-gray-50'
                                  }`}
                                  onDragOver={allowDrop}
                                  onDrop={(e) => handleDrop(e, task.id, requirement.id)}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <div className="font-medium text-sm text-gray-900">
                                        {requirement.label}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Drag & drop images here or use Upload
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <button onClick={() => handleUploadClick(task.id, requirement.id)} className="text-blue-600 hover:text-blue-500 text-sm">Upload</button>
                                    </div>
                                  </div>
                                  {/* Thumbnails */}
                                  {requirement.uploads && requirement.uploads.length > 0 && (
                                    <div className="max-h-72 overflow-y-auto pr-1">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-gray-600">{requirement.uploads.length} photos</span>
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() => handleDeleteAllPhotos(requirement)}
                                            className="text-red-600 hover:text-red-700 text-xs underline"
                                          >
                                            Delete All
                                          </button>
                                          <a
                                            href={`/api/work-orders/${params.id}/photos/download?scope=requirement&requirementId=${requirement.id}`}
                                            className="text-blue-600 hover:text-blue-700 text-xs underline"
                                          >
                                            Download All
                                          </a>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        {requirement.uploads.map((u, idx) => (
                                          <div key={u.id} className="relative group cursor-pointer" onClick={() => openLightbox(requirement.uploads || [], idx)}>
                                            <img src={u.url} alt={requirement.label} className="w-full h-24 object-cover rounded" />
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-2 rounded">
                                              <span className="text-white text-xs underline">View</span>
                                              <a href={u.url} download className="text-white text-xs underline" onClick={(e) => e.stopPropagation()}>Download</a>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleDeletePhoto(u.id)
                                                }}
                                                className="text-white text-xs underline hover:text-red-300"
                                              >
                                                Delete
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeSubTab === "bid" && (
                  <div>
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className="text-lg font-medium text-gray-900">Bid Items</h3>
                      <button
                        onClick={handleAddBidItem}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Bid Item
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Task</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Qty</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">UOM</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Contractor</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Client</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Comments</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Messages</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasks.filter(task => 
                            task.taskType === "Bid"
                          ).map((task) => (
                            <tr key={`bid-${task.id}`}>
                              <td className="border border-gray-300 px-3 py-2">
                                {task.taskName === "Other" ? (
                                  <input 
                                    type="text" 
                                    value={task.customTaskName || ""} 
                                    onChange={(e) => {
                                      const updated = tasks.map(t => t.id === task.id ? { ...t, customTaskName: e.target.value } : t)
                                      setTasks(updated)
                                    }}
                                    placeholder="Enter custom task name..."
                                    className="w-full border-0 text-sm"
                                  />
                                ) : (
                                  <select value={task.taskName} onChange={(e) => {
                                    const updated = tasks.map(t => t.id === task.id ? { ...t, taskName: e.target.value } : t)
                                    setTasks(updated)
                                  }} className="w-full border-0 text-sm">
                                    <option value="">Select Task...</option>
                                    <option value="Debris - Exterior">Debris - Exterior</option>
                                    <option value="Debris - Sattelite">Debris - Satellite</option>
                                    <option value="Roof - Tarp">Roof - Tarp</option>
                                    <option value="Roof - Asphalt Shingle">Roof - Asphalt Shingle</option>
                                    <option value="Handrail - Exterior">Handrail - Exterior</option>
                                    <option value="Guardrail - Replace">Guardrail - Replace</option>
                                    <option value="Other">Other (Custom)</option>
                                  </select>
                                )}
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <input type="number" value={task.qty} onChange={(e) => {
                                  const updated = tasks.map(t => t.id === task.id ? { ...t, qty: parseInt(e.target.value) || 0 } : t)
                                  setTasks(updated)
                                }} className="w-full border-0 text-sm" />
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <select value={task.uom} onChange={(e) => {
                                  const updated = tasks.map(t => t.id === task.id ? { ...t, uom: e.target.value } : t)
                                  setTasks(updated)
                                }} className="w-full border-0 text-sm">
                                  <option value="EACH">EACH</option>
                                  <option value="LF">LF</option>
                                  <option value="SQFT">SQFT</option>
                                  <option value="CYD">CYD</option>
                                </select>
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-500">$</span>
                                  <input type="number" value={task.contractorPrice} onChange={(e) => {
                                    const updated = tasks.map(t => t.id === task.id ? { ...t, contractorPrice: parseFloat(e.target.value) || 0 } : t)
                                    setTasks(updated)
                                  }} className="w-full border-0 text-sm" />
                                </div>
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-500">$</span>
                                  <input type="number" value={task.clientPrice} onChange={(e) => {
                                    const updated = tasks.map(t => t.id === task.id ? { ...t, clientPrice: parseFloat(e.target.value) || 0 } : t)
                                    setTasks(updated)
                                  }} className="w-full border-0 text-sm" />
                                </div>
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <textarea value={task.comments} onChange={(e) => {
                                  const updated = tasks.map(t => t.id === task.id ? { ...t, comments: e.target.value } : t)
                                  setTasks(updated)
                                }} className="w-full border-0 text-sm resize-y min-h-24" rows={4} />
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center">
                                <button
                                  onClick={() => {
                                    setShowBidMessageModal({ bidId: task.id, bidName: getTaskDisplayName(task) })
                                    fetchBidMessages(task.id)
                                  }}
                                  className="flex items-center justify-center space-x-1 text-blue-600 hover:text-blue-800"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    {bidMessages[task.id]?.length || 0}
                                  </span>
                                </button>
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <div className="flex items-center space-x-1">
                                  <button 
                                    onClick={() => {
                                      const updatedTasks = tasks.filter(t => t.id !== task.id)
                                      setTasks(updatedTasks)
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50">
                            <td colSpan={3} className="border border-gray-300 px-3 py-2 font-medium">
                              Count {bidCount}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-medium">${bidContractorTotal.toFixed(2)}</td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-medium">${bidClientTotal.toFixed(2)}</td>
                            <td className="border border-gray-300 px-3 py-2" />
                            <td className="border border-gray-300 px-3 py-2" />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleSaveTasks}
                        disabled={savingTasks}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded flex items-center"
                      >
                        {savingTasks ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Bid
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {activeSubTab === "invoice" && (
                  <div>
                    {/* Invoice Header */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Client Invoice</h3>
                          <p className="text-sm text-gray-600">Total: ${calculateInvoiceTotal().toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Status: <span className="font-medium">{invoice.status}</span></p>
                        </div>
                        <div className="flex space-x-4">
                          <div>
                            <label className="text-xs text-gray-500">Invoice#:</label>
                            <input
                              type="text"
                              value={invoice.invoiceNumber}
                              onChange={(e) => setInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                              className="ml-1 px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="2512020"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Invoice Date:</label>
                            <input
                              type="date"
                              value={invoice.invoiceDate}
                              onChange={(e) => setInvoice(prev => ({ ...prev, invoiceDate: e.target.value }))}
                              className="ml-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Invoice Items Table */}
                    <div className="overflow-x-auto mb-6">
                      <table className="min-w-full border border-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Qty</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Price</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Total</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Adj Price</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Discount%</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Final Total</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Comments</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Flat Fee</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoice.items.map((item) => (
                            <tr key={item.id}>
                              <td className="border border-gray-300 px-3 py-2">
                                <select
                                  value={item.item}
                                  onChange={(e) => updateInvoiceItem(item.id, 'item', e.target.value)}
                                  className="w-full border-0 text-sm"
                                >
                                  <option value="">Select Item...</option>
                                  <option value="Padlock And Hasp">Padlock And Hasp</option>
                                  <option value="Slide Lock">Slide Lock</option>
                                  <option value="Refrigerator - Clean">Refrigerator - Clean</option>
                                  <option value="Toilet - Clean">Toilet - Clean</option>
                                  <option value="Debris - Exterior">Debris - Exterior</option>
                                  <option value="Gutters - Cleaning">Gutters - Cleaning</option>
                                  <option value="Handrail">Handrail</option>
                                  <option value="Other">Other (Custom)</option>
                                </select>
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <input
                                  type="number"
                                  value={item.qty}
                                  onChange={(e) => updateInvoiceItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                                  className="w-full border-0 text-sm"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) => updateInvoiceItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-full border-0 text-sm"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <span className="text-sm">${item.total.toFixed(2)}</span>
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <input
                                  type="number"
                                  value={item.adjPrice}
                                  onChange={(e) => updateInvoiceItem(item.id, 'adjPrice', parseFloat(e.target.value) || 0)}
                                  className="w-full border-0 text-sm"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <input
                                  type="number"
                                  value={item.discountPercent}
                                  onChange={(e) => updateInvoiceItem(item.id, 'discountPercent', parseFloat(e.target.value) || 0)}
                                  className="w-full border-0 text-sm"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                />
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <span className="text-sm font-medium">${item.finalTotal.toFixed(2)}</span>
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <textarea
                                  value={item.comments}
                                  onChange={(e) => updateInvoiceItem(item.id, 'comments', e.target.value)}
                                  className="w-full border-0 text-sm resize-y min-h-16"
                                  rows={2}
                                />
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.flatFee}
                                  onChange={(e) => updateInvoiceItem(item.id, 'flatFee', e.target.checked)}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <button
                                  onClick={() => deleteInvoiceItem(item.id)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50">
                            <td colSpan={3} className="border border-gray-300 px-3 py-2 font-medium">
                              Total Items: {invoice.items.length}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                              ${invoice.items.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                              ${invoice.items.reduce((sum, item) => sum + item.adjPrice, 0).toFixed(2)}
                            </td>
                            <td className="border border-gray-300 px-3 py-2"></td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                              ${calculateInvoiceTotal().toFixed(2)}
                            </td>
                            <td colSpan={3} className="border border-gray-300 px-3 py-2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Invoice Footer */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          <div>
                            <label className="text-sm text-gray-600">Sent to Client:</label>
                            <input
                              type="date"
                              value={invoice.sentToClientDate || ''}
                              onChange={(e) => setInvoice(prev => ({ ...prev, sentToClientDate: e.target.value }))}
                              className="ml-2 px-3 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Complete Date:</label>
                            <input
                              type="date"
                              value={invoice.completeDate || ''}
                              onChange={(e) => setInvoice(prev => ({ ...prev, completeDate: e.target.value }))}
                              className="ml-2 px-3 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={invoice.noCharge}
                              onChange={(e) => setInvoice(prev => ({ ...prev, noCharge: e.target.checked }))}
                              className="h-4 w-4 mr-2"
                            />
                            <span className="text-sm text-gray-600">No Charge</span>
                          </label>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={addInvoiceItem}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </button>
                          <button 
                            onClick={saveInvoice}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Invoice
                          </button>
                          <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center">
                            <Printer className="h-4 w-4 mr-2" />
                            Print Client
                          </button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-gray-600">Client Total: $</label>
                          <input
                            type="number"
                            value={invoice.clientTotal}
                            onChange={(e) => setInvoice(prev => ({ ...prev, clientTotal: parseFloat(e.target.value) || 0 }))}
                            className="ml-2 px-3 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Enter Notes:</label>
                          <textarea
                            value={invoice.notes}
                            onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-sm resize-y min-h-20"
                            rows={3}
                          />
                        </div>
                        <div className="flex space-x-4">
                          <div>
                            <label className="text-sm text-gray-600">Invoice Date:</label>
                            <input
                              type="date"
                              value={invoice.invoiceDate}
                              onChange={(e) => setInvoice(prev => ({ ...prev, invoiceDate: e.target.value }))}
                              className="ml-2 px-3 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Invoice#:</label>
                            <input
                              type="text"
                              value={invoice.invoiceNumber}
                              onChange={(e) => setInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                              className="ml-2 px-3 py-1 border border-gray-300 rounded text-sm"
                              placeholder="2512020"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === "comments" && (
                  <div>
                    <div className="space-y-4">
                      {workOrder.messages.map((message) => (
                        <div key={message.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">{message.author.name}</span>
                              <span className="text-sm text-gray-500">({message.author.role})</span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(message.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-700">{message.content}</p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Add a comment..."
                      />
                      <button
                        onClick={handleSendMessage}
                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Property History Section */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div 
          className="p-4 border-b border-gray-200 cursor-pointer flex items-center justify-between"
          onClick={() => setShowPropertyHistory(!showPropertyHistory)}
        >
          <h3 className="font-medium text-gray-900">Property History</h3>
          {showPropertyHistory ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
        
        {showPropertyHistory && (
          <div className="p-4">
            <div className="flex space-x-1 mb-4">
              <button className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                Past WO's
              </button>
              <button className="px-3 py-1 text-gray-600 hover:text-gray-800 rounded text-sm font-medium">
                Bid History
              </button>
              <button className="px-3 py-1 text-gray-600 hover:text-gray-800 rounded text-sm font-medium">
                Completion History
              </button>
              <button className="px-3 py-1 text-gray-600 hover:text-gray-800 rounded text-sm font-medium">
                Damage History
              </button>
              <button className="px-3 py-1 text-gray-600 hover:text-gray-800 rounded text-sm font-medium">
                Appliance History
              </button>
              <button className="px-3 py-1 text-gray-600 hover:text-gray-800 rounded text-sm font-medium">
                Violation History
              </button>
              <button className="px-3 py-1 text-gray-600 hover:text-gray-800 rounded text-sm font-medium">
                Hazard History
              </button>
              <button className="px-3 py-1 text-gray-600 hover:text-gray-800 rounded text-sm font-medium">
                Contractor Invoice History
              </button>
              <button className="px-3 py-1 text-gray-600 hover:text-gray-800 rounded text-sm font-medium">
                Client Invoice History
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Action</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">IPL NO</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Work Order</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Work Type</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Phot...</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Contractor</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Due Date</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Address</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={9} className="border border-gray-300 px-3 py-8 text-center text-gray-500">
                      No historical data available
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateBid && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Task</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Type
                  </label>
                  <select
                    value={newTask.taskType}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Name
                  </label>
                  <select
                    value={newTask.taskName}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={newTask.qty}
                    onChange={(e) => setNewTask(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Price
                  </label>
                  <input
                    type="number"
                    value={newTask.clientPrice}
                    onChange={(e) => setNewTask(prev => ({ ...prev, clientPrice: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    step="0.01"
                    min="0"
                  />
                </div>

                {newTask.taskType && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Photo Requirements:</h4>
                    <div className="space-y-1">
                      {generatePhotoRequirements(newTask.taskType).map((req) => (
                        <div key={req.id} className="text-sm text-blue-800">
                          • {req.label} {req.required ? '(Required)' : '(Optional)'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setShowCreateBid(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleAddTask()
                    setShowCreateBid(false)
                  }}
                  disabled={!newTask.taskType || !newTask.taskName}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightbox.open && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button className="absolute top-4 right-4 text-white text-xl" onClick={closeLightbox} aria-label="Close">✕</button>
          <button className="absolute left-4 text-white text-3xl px-2 py-1" onClick={prevLightbox} aria-label="Previous">‹</button>
          <img
            src={lightbox.images[lightbox.index]?.url}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded"
            alt="Preview"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-6 flex items-center space-x-4">
            <a
              href={lightbox.images[lightbox.index]?.url}
              download
              className="bg-white/90 hover:bg-white text-gray-900 px-4 py-2 rounded"
              onClick={(e) => e.stopPropagation()}
            >
              Download
            </a>
            <span className="text-white text-sm">
              {lightbox.index + 1} / {lightbox.images.length}
            </span>
          </div>
          <button className="absolute right-4 text-white text-3xl px-2 py-1" onClick={nextLightbox} aria-label="Next">›</button>
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

      {/* Bid Message Modal */}
      {showBidMessageModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Messages for: {showBidMessageModal.bidName}
                </h3>
                <button
                  onClick={() => setShowBidMessageModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {bidMessages[showBidMessageModal.bidId]?.map((message) => (
                  <div key={message.id} className="border-l-4 border-green-500 pl-4">
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
                {(!bidMessages[showBidMessageModal.bidId] || bidMessages[showBidMessageModal.bidId].length === 0) && (
                  <p className="text-gray-500 text-center py-4">No messages yet</p>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <textarea
                  value={newBidMessage}
                  onChange={(e) => setNewBidMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={2}
                />
                <button
                  onClick={() => sendBidMessage(showBidMessageModal.bidId)}
                  disabled={!newBidMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Assign Users to Work Order</h3>
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Contractor Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contractor
                </label>
                <select
                  value={assignmentData.assignedContractorId}
                  onChange={(e) => handleAssignmentChange('assignedContractorId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Contractor</option>
                  {users.filter(user => user.role === 'CONTRACTOR').map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Coordinator Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coordinator
                </label>
                <select
                  value={assignmentData.assignedCoordinatorId}
                  onChange={(e) => handleAssignmentChange('assignedCoordinatorId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Coordinator</option>
                  {users.filter(user => user.role === 'ADMIN' || user.role === 'CONTRACTOR').map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Processor Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Processor
                </label>
                <select
                  value={assignmentData.assignedProcessorId}
                  onChange={(e) => handleAssignmentChange('assignedProcessorId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Processor</option>
                  {users.filter(user => user.role === 'ADMIN' || user.role === 'CONTRACTOR').map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={saveAssignments}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Assignments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

