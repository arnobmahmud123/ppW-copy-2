"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import PhotoEditorModal from "@/components/PhotoEditorModal"
import { 
  FileText, 
  Search,
  Plus,
  Sparkles,
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
  workOrderNumber?: string
  title: string
  description: string
  status: string
  serviceType: string
  addressLine1: string
  addressLine2?: string | null
  city: string
  state: string
  postalCode: string
  gpsLat?: number | null
  gpsLon?: number | null
  lockCode?: string | null
  lockLocation?: string | null
  keyCode?: string | null
  gateCode?: string | null
  lotSize?: string | null
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
  messageThreadId?: string | null
  messages: Message[]
  threadedMessages?: WorkOrderThreadMessage[]
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

interface WorkOrderThreadAttachment {
  id: string
  fileName: string
  mimeType: string
  isImage: boolean
}

interface WorkOrderThreadMessage {
  id: string
  body: string
  authorType: string
  messageType: string
  visibilityScope: string
  createdAt: string
  updatedAt: string
  createdByUserId: string | null
  createdByUser: {
    id: string
    name: string
    avatarUrl: string | null
    role: string
  } | null
  attachments: WorkOrderThreadAttachment[]
}

const mapLegacyWorkOrderMessage = (message: Message): WorkOrderThreadMessage => ({
  id: `legacy-${message.id}`,
  body: message.content,
  authorType: "USER",
  messageType: "COMMENT",
  visibilityScope: "INTERNAL_ONLY",
  createdAt: message.createdAt,
  updatedAt: message.createdAt,
  createdByUserId: null,
  createdByUser: {
    id: "",
    name: message.author?.name || "System",
    avatarUrl: null,
    role: message.author?.role || "",
  },
  attachments: [],
})

const sortWorkOrderThreadMessages = (messages: WorkOrderThreadMessage[]) =>
  [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

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

type PropertyHistoryTab =
  | "past"
  | "bid"
  | "completion"
  | "damage"
  | "appliance"
  | "violation"
  | "hazard"
  | "contractorInvoice"
  | "clientInvoice"

interface PropertyHistoryRow {
  id: string
  iplNo: string
  workOrderNumber: string
  status: string
  workType: string
  photoCount: number
  contractor: string
  dueDate?: string | null
  address: string
  invoiceNumber?: string | null
  invoiceStatus?: string | null
  invoiceTotal?: number
  invoiceDate?: string | null
  workOrderId?: string
  ctic?: string
  pics?: number
  date?: string | null
  task?: string
  qty?: number
  contractorPrice?: number
  contractorTotal?: number
  clientPrice?: number
  clientTotal?: number
  comments?: string
}

type WorkOrderOpsTab = "documents" | "imports" | "access"

interface AccessLogRow {
  id: string
  type: string
  detail: string
  accessDate: string
  oldValue: string
  newValue: string
  accessBy: string
}

interface PropertyInfoFormState {
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  lockCode: string
  lockLocation: string
  keyCode: string
  gateCode: string
  lotSize: string
  gpsLat: string
  gpsLon: string
}

export default function WorkOrderDetail() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("instructions")
  const [activeSubTab, setActiveSubTab] = useState("instructions")
  const [showWorkOrderDetails, setShowWorkOrderDetails] = useState(true)
  const [showPropertyHistory, setShowPropertyHistory] = useState(true)
  const [activeOpsTab, setActiveOpsTab] = useState<WorkOrderOpsTab>("documents")
  const [accessLogFilters, setAccessLogFilters] = useState<Record<string, string>>({})
  const [activePropertyHistoryTab, setActivePropertyHistoryTab] = useState<PropertyHistoryTab>("past")
  const [propertyHistoryCommentSearch, setPropertyHistoryCommentSearch] = useState("")
  const [propertyHistoryFilters, setPropertyHistoryFilters] = useState<Record<string, string>>({})
  const [showCreateBid, setShowCreateBid] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [messageFiles, setMessageFiles] = useState<FileList | null>(null)
  const [threadMessages, setThreadMessages] = useState<WorkOrderThreadMessage[]>([])
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messageImageViewer, setMessageImageViewer] = useState<{
    images: { id: string; url: string; title?: string }[]
    index: number
  } | null>(null)
  const [loadingThreadMessages, setLoadingThreadMessages] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const [instructions, setInstructions] = useState("")
  const [savingTasks, setSavingTasks] = useState(false)
  const [generatingAiBid, setGeneratingAiBid] = useState(false)
  const [generatingBidRowId, setGeneratingBidRowId] = useState<string | null>(null)
  const [savingInstructions, setSavingInstructions] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [taskMessages, setTaskMessages] = useState<{[key: string]: any[]}>({})
  const [bidMessages, setBidMessages] = useState<{[key: string]: any[]}>({})
  const [showTaskMessageModal, setShowTaskMessageModal] = useState<{taskId: string, taskName: string} | null>(null)
  const [showBidMessageModal, setShowBidMessageModal] = useState<{bidId: string, bidName: string} | null>(null)
  const [loadingMessageCounts, setLoadingMessageCounts] = useState<{[taskId: string]: boolean}>({})
  const [newTaskMessage, setNewTaskMessage] = useState("")
  const [newBidMessage, setNewBidMessage] = useState("")
  const [users, setUsers] = useState<any[]>([])
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [isEditingPropertyInfo, setIsEditingPropertyInfo] = useState(false)
  const [savingPropertyInfo, setSavingPropertyInfo] = useState(false)
  const [propertyInfoForm, setPropertyInfoForm] = useState<PropertyInfoFormState>({
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    lockCode: "",
    lockLocation: "",
    keyCode: "",
    gateCode: "",
    lotSize: "",
    gpsLat: "",
    gpsLon: "",
  })
  const [assignmentData, setAssignmentData] = useState({
    assignedContractorId: "",
    assignedCoordinatorId: "",
    assignedProcessorId: ""
  })

  const documentFiles = (workOrder?.files || []).filter((file) => {
    const mime = String(file.mimeType || "").toLowerCase()
    return mime.includes("pdf") || mime.includes("document") || mime.includes("sheet") || mime.includes("text")
  })

  const visibleThreadMessages = threadMessages.length > 0
    ? threadMessages
    : Array.isArray(workOrder?.threadedMessages) && workOrder.threadedMessages.length > 0
      ? sortWorkOrderThreadMessages(workOrder.threadedMessages)
      : Array.isArray(workOrder?.messages)
        ? sortWorkOrderThreadMessages(workOrder.messages.map(mapLegacyWorkOrderMessage))
        : []

  const importedFiles = (workOrder?.files || []).filter((file) => {
    const mime = String(file.mimeType || "").toLowerCase()
    return !(
      mime.includes("pdf") ||
      mime.includes("document") ||
      mime.includes("sheet") ||
      mime.includes("text")
    )
  })

  const accessLogs: AccessLogRow[] = [
    workOrder?.createdAt
      ? {
          id: `created-${workOrder.id}`,
          type: "Created",
          detail: "Work Order Created",
          accessDate: workOrder.createdAt,
          oldValue: "-",
          newValue: workOrder.status || "NEW",
          accessBy: session?.user?.name || "System",
        }
      : null,
    workOrder?.updatedAt
      ? {
          id: `updated-${workOrder.id}`,
          type: "Edited",
          detail: "Work Order Edited",
          accessDate: workOrder.updatedAt,
          oldValue: "-",
          newValue: workOrder.status || "-",
          accessBy: session?.user?.name || "System",
        }
      : null,
    ...(workOrder?.messages || []).map((message) => ({
      id: `message-${message.id}`,
      type: "Edited",
      detail: "Comments Saved",
      accessDate: message.createdAt,
      oldValue: "-",
      newValue: message.content,
      accessBy: message.author?.name || "User",
    })),
    ...(workOrder?.files || []).map((file) => ({
      id: `file-${file.id}`,
      type: "Imported",
      detail: `${file.category || "File"} Uploaded`,
      accessDate: file.createdAt || workOrder?.updatedAt || workOrder?.createdAt || "",
      oldValue: "-",
      newValue: file.url.split("/").pop() || file.url,
      accessBy: session?.user?.name || "System",
    })),
    ...(workOrder?.invoices || []).map((inv, index) => ({
      id: `invoice-${inv.id || index}`,
      type: "Edited",
      detail: "Client Invoice Saved",
      accessDate: inv.invoiceDate || workOrder?.updatedAt || workOrder?.createdAt || "",
      oldValue: "-",
      newValue: inv.invoiceNumber || "Invoice updated",
      accessBy: session?.user?.name || "System",
    })),
  ]
    .filter((entry): entry is AccessLogRow => Boolean(entry && entry.accessDate))
    .sort((a, b) => new Date(b.accessDate).getTime() - new Date(a.accessDate).getTime())

  const filteredAccessLogs = accessLogs.filter((entry) => {
    const matches = (key: keyof AccessLogRow, value: string) =>
      !value || String(entry[key] || "").toLowerCase().includes(value.toLowerCase())

    return (
      matches("type", accessLogFilters.type || "") &&
      matches("detail", accessLogFilters.detail || "") &&
      matches("accessDate", accessLogFilters.accessDate || "") &&
      matches("oldValue", accessLogFilters.oldValue || "") &&
      matches("newValue", accessLogFilters.newValue || "") &&
      matches("accessBy", accessLogFilters.accessBy || "")
    )
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
  const documentInputRef = useRef<HTMLInputElement | null>(null)
  const messagePhotoInputRef = useRef<HTMLInputElement | null>(null)
  const [currentUpload, setCurrentUpload] = useState<{ taskId: string; requirementId: string } | null>(null)
  const [uploadingDocuments, setUploadingDocuments] = useState(false)
  const [lightbox, setLightbox] = useState<{ open: boolean; images: { id: string; url: string }[]; index: number }>(
    { open: false, images: [], index: 0 }
  )
  const [propertyHistory, setPropertyHistory] = useState<Record<PropertyHistoryTab, PropertyHistoryRow[]>>({
    past: [],
    bid: [],
    completion: [],
    damage: [],
    appliance: [],
    violation: [],
    hazard: [],
    contractorInvoice: [],
    clientInvoice: [],
  })
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
  const workOrderDetailsRef = useRef<HTMLDivElement | null>(null)
  const propertyHistoryRef = useRef<HTMLDivElement | null>(null)

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
  const activeSoftTabClass =
    "border border-[rgba(209,198,255,0.92)] bg-[linear-gradient(135deg,#ffe7f8_0%,#ece1ff_58%,#dcebff_100%)] text-[#24324a] shadow-[0_12px_24px_rgba(168,132,255,0.16)]"
  const activeSoftActionClass =
    "inline-flex items-center rounded-2xl border border-[rgba(209,198,255,0.92)] bg-[linear-gradient(135deg,#ffe7f8_0%,#ece1ff_58%,#dcebff_100%)] px-4 py-2 text-sm font-semibold text-[#24324a] shadow-[0_12px_24px_rgba(168,132,255,0.16)] transition hover:brightness-105 disabled:opacity-60"

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
      setLoading(true)
      Promise.all([
        fetchWorkOrder(),
        fetchTasks(),
        fetchInvoice(),
        fetchUsers(),
        fetchPropertyHistory(),
      ]).finally(() => setLoading(false))
    }
  }, [params.id])

  useEffect(() => {
    if (workOrder) {
      setAssignmentData({
        assignedContractorId: workOrder.assignedContractorId || "",
        assignedCoordinatorId: workOrder.assignedCoordinatorId || "",
        assignedProcessorId: workOrder.assignedProcessorId || ""
      })
      setPropertyInfoForm({
        addressLine1: workOrder.addressLine1 || "",
        addressLine2: workOrder.addressLine2 || "",
        city: workOrder.city || "",
        state: workOrder.state || "",
        postalCode: workOrder.postalCode || "",
        lockCode: workOrder.lockCode || "",
        lockLocation: workOrder.lockLocation || "",
        keyCode: workOrder.keyCode || "",
        gateCode: workOrder.gateCode || "",
        lotSize: workOrder.lotSize || "",
        gpsLat: workOrder.gpsLat != null ? String(workOrder.gpsLat) : "",
        gpsLon: workOrder.gpsLon != null ? String(workOrder.gpsLon) : "",
      })
    }
  }, [workOrder])

  useEffect(() => {
    if (!workOrder) return

    const nextMessages =
      Array.isArray(workOrder.threadedMessages) && workOrder.threadedMessages.length > 0
        ? sortWorkOrderThreadMessages(workOrder.threadedMessages)
        : Array.isArray(workOrder.messages)
          ? sortWorkOrderThreadMessages(workOrder.messages.map(mapLegacyWorkOrderMessage))
          : []

    if (nextMessages.length > 0) {
      setThreadMessages((current) => (current.length > 0 ? current : nextMessages))
    }

    if (workOrder.messageThreadId) {
      setThreadId((current) => current ?? workOrder.messageThreadId ?? null)
    }
  }, [workOrder])

  // Auto-load thread messages whenever Comments tab is opened
  useEffect(() => {
    if (activeSubTab === "comments" && params.id) {
      fetchThreadMessages(String(params.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab, params.id])

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
        setThreadId(data.messageThreadId ?? null)
        setThreadMessages(
          Array.isArray(data.threadedMessages) && data.threadedMessages.length > 0
            ? sortWorkOrderThreadMessages(data.threadedMessages)
            : Array.isArray(data.messages)
              ? sortWorkOrderThreadMessages(data.messages.map(mapLegacyWorkOrderMessage))
              : []
        )
        setInstructions(data.description || "")
        // If tasks present already, merge files now
        setTasks(prev => mergeFilesIntoTasks(data.files, prev))
      }
    } catch (error) {
      console.error("Error fetching work order:", error)
    }
  }

  const fetchPropertyHistory = async () => {
    try {
      const response = await fetch(`/api/work-orders/${params.id}/history`)
      if (!response.ok) return

      const data = await response.json()
      setPropertyHistory({
        past: data.past || [],
        bid: data.bid || [],
        completion: data.completion || [],
        damage: data.damage || [],
        appliance: data.appliance || [],
        violation: data.violation || [],
        hazard: data.hazard || [],
        contractorInvoice: data.contractorInvoice || [],
        clientInvoice: data.clientInvoice || [],
      })
    } catch (error) {
      console.error("Error fetching property history:", error)
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
            const effectiveTaskType = task.taskType || (task.taskName && task.taskName.includes("(Bid)") ? "Bid" : task.taskType)
            const normalizedTask = {
              ...task,
              taskType: effectiveTaskType,
            } as Task
            return {
              ...normalizedTask,
              photoRequirements: normalizePhotoRequirements(normalizedTask)
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

  const propertyHistoryTabs: { key: PropertyHistoryTab; label: string }[] = [
    { key: "past", label: "Past WO's" },
    { key: "bid", label: "Bid History" },
    { key: "completion", label: "Completion History" },
    { key: "damage", label: "Damage History" },
    { key: "appliance", label: "Appliance History" },
    { key: "violation", label: "Violation History" },
    { key: "hazard", label: "Hazard History" },
    { key: "contractorInvoice", label: "Contractor Invoice History" },
    { key: "clientInvoice", label: "Client Invoice History" },
  ]

  const showingInvoiceHistory =
    activePropertyHistoryTab === "contractorInvoice" || activePropertyHistoryTab === "clientInvoice"
  const showingBidHistory = activePropertyHistoryTab === "bid"
  const showingCompletionHistory = activePropertyHistoryTab === "completion"
  const formatOptionalDisplayDate = (value?: string | null) => {
    if (!value || !String(value).trim()) return "Not set"
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString()
  }
  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleCopyWorkOrder = async () => {
    if (!workOrder) return

    const summary = [
      `Work Order: ${workOrder.workOrderNumber || workOrder.id}`,
      `Title: ${workOrder.title}`,
      `Status: ${workOrder.status}`,
      `Service Type: ${workOrder.serviceType}`,
      `Address: ${workOrder.addressLine1}, ${workOrder.city}, ${workOrder.state} ${workOrder.postalCode}`,
      `Client: ${workOrder.client?.name || "Unknown"}`,
      `Contractor: ${workOrder.assignedContractor?.name || "Unassigned"}`,
      `Due Date: ${formatOptionalDisplayDate(workOrder.dueDate)}`,
    ].join("\n")

    try {
      await navigator.clipboard.writeText(summary)
    } catch (error) {
      console.error("Failed to copy work order summary:", error)
      alert("Couldn't copy work order details.")
    }
  }

  const handleDeleteWorkOrder = async () => {
    if (!workOrder) return
    if (!confirm(`Delete work order ${workOrder.workOrderNumber || workOrder.id}? This cannot be undone.`)) return

    try {
      const response = await fetch(`/api/work-orders/${params.id}`, {
        method: "DELETE",
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        alert(data.error || "Failed to delete work order.")
        return
      }

      router.push("/dashboard/admin/work-orders")
      router.refresh()
    } catch (error) {
      console.error("Failed to delete work order:", error)
      alert("Failed to delete work order.")
    }
  }

  const handleOpenBidInvoice = () => {
    setShowWorkOrderDetails(true)
    setActiveSubTab("bid")
    setActiveTab("invoice")
    requestAnimationFrame(() => scrollToSection(workOrderDetailsRef))
  }

  const handleOpenPropertyHistory = () => {
    setShowPropertyHistory(true)
    requestAnimationFrame(() => scrollToSection(propertyHistoryRef))
  }

  const handleOpenMap = () => {
    if (!workOrder) return
    const address = [workOrder.addressLine1, workOrder.city, workOrder.state, workOrder.postalCode]
      .filter(Boolean)
      .join(", ")
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank", "noopener,noreferrer")
  }

  const handleOpenMessages = () => {
    setActiveTab("messages")
    setShowWorkOrderDetails(true)
    setActiveSubTab("comments")
    requestAnimationFrame(() => scrollToSection(workOrderDetailsRef))
  }

  const handlePropertyInfoChange = (field: keyof PropertyInfoFormState, value: string) => {
    setPropertyInfoForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleCancelPropertyInfoEdit = () => {
    if (!workOrder) return
    setPropertyInfoForm({
      addressLine1: workOrder.addressLine1 || "",
      addressLine2: workOrder.addressLine2 || "",
      city: workOrder.city || "",
      state: workOrder.state || "",
      postalCode: workOrder.postalCode || "",
      lockCode: workOrder.lockCode || "",
      lockLocation: workOrder.lockLocation || "",
      keyCode: workOrder.keyCode || "",
      gateCode: workOrder.gateCode || "",
      lotSize: workOrder.lotSize || "",
      gpsLat: workOrder.gpsLat != null ? String(workOrder.gpsLat) : "",
      gpsLon: workOrder.gpsLon != null ? String(workOrder.gpsLon) : "",
    })
    setIsEditingPropertyInfo(false)
  }

  const handleSavePropertyInfo = async () => {
    if (!workOrder) return

    if (!propertyInfoForm.addressLine1.trim() || !propertyInfoForm.city.trim() || !propertyInfoForm.state.trim()) {
      alert("Address, city, and state are required.")
      return
    }

    setSavingPropertyInfo(true)
    try {
      const response = await fetch(`/api/work-orders/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...propertyInfoForm,
          gpsLat: propertyInfoForm.gpsLat.trim() ? Number(propertyInfoForm.gpsLat) : null,
          gpsLon: propertyInfoForm.gpsLon.trim() ? Number(propertyInfoForm.gpsLon) : null,
          applyPropertyInfoToMatchingWorkOrders: true,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        alert(data.error || "Failed to update property info.")
        return
      }

      await Promise.all([fetchWorkOrder(), fetchPropertyHistory()])
      setIsEditingPropertyInfo(false)
      alert(`Property info updated across ${data.propertyUpdateCount || 1} work order(s).`)
    } catch (error) {
      console.error("Failed to save property info:", error)
      alert("Failed to update property info.")
    } finally {
      setSavingPropertyInfo(false)
    }
  }

  const formatHistoryWorkType = (value?: string | null) =>
    value ? value.replaceAll("_", " ") : "-"
  const activeHistoryRows = (propertyHistory[activePropertyHistoryTab] || []).filter((row) => {
    if (showingBidHistory || showingCompletionHistory) {
      const needle = propertyHistoryCommentSearch.trim().toLowerCase()
      if (needle && !String(row.comments || "").toLowerCase().includes(needle)) {
        return false
      }
    }

    const getFieldValue = (field: string) => {
      switch (field) {
        case "status":
          return row.status || ""
        case "ctic":
          return row.ctic || ""
        case "iplNo":
          return row.iplNo || ""
        case "workOrderNumber":
          return row.workOrderNumber || ""
        case "pics":
          return String(showingBidHistory ? row.pics ?? 0 : row.photoCount ?? 0)
        case "workType":
          return formatHistoryWorkType(row.workType)
        case "contractor":
          return row.contractor || ""
        case "date":
          return row.date ? new Date(row.date).toLocaleDateString() : row.dueDate ? new Date(row.dueDate).toLocaleDateString() : ""
        case "address":
          return row.address || ""
        case "task":
          return row.task || ""
        case "qty":
          return String(row.qty ?? 0)
        case "contractorPrice":
          return String(showingBidHistory ? row.contractorTotal ?? 0 : "")
        case "clientPrice":
          return String(showingBidHistory ? row.clientTotal ?? 0 : "")
        case "comments":
          return row.comments || ""
        default:
          return ""
      }
    }

    return Object.entries(propertyHistoryFilters).every(([field, value]) => {
      const needle = value.trim().toLowerCase()
      if (!needle) return true
      return getFieldValue(field).toLowerCase().includes(needle)
    })
  })
  const historyFilterInputClassName =
    "min-w-[96px] w-full rounded-xl border border-white/10 bg-[#1f2941] px-3 py-2 text-xs text-[#edf2ff] outline-none placeholder:text-[#7f8bb1] focus:border-[#ff7a49]/60"

  const setPropertyHistoryFilter = (field: string, value: string) => {
    setPropertyHistoryFilters((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const fetchThreadMessages = async (woid: string) => {
    setLoadingThreadMessages(true)
    try {
      const res = await fetch(`/api/work-orders/${woid}/messages`)
      if (!res.ok) {
        throw new Error(`Failed to load work order comments: ${res.status}`)
      }

      const data = await res.json()
      const nextThreadId = data.threadId ?? null
      const threadedMessages: WorkOrderThreadMessage[] = Array.isArray(data.threadedMessages)
        ? data.threadedMessages
        : []
      const legacyMessages: WorkOrderThreadMessage[] = Array.isArray(data.messages)
        ? data.messages.map(mapLegacyWorkOrderMessage)
        : []

      if (nextThreadId) setThreadId(nextThreadId)

      const seenIds = new Set<string>()
      const mergedMessages = [...threadedMessages, ...legacyMessages].filter((message) => {
        const dedupeKey =
          message.id.startsWith("legacy-")
            ? `legacy:${message.body}:${message.createdAt}:${message.createdByUser?.name ?? ""}`
            : `thread:${message.id}`
        if (seenIds.has(dedupeKey)) return false
        seenIds.add(dedupeKey)
        return true
      })

      setThreadMessages(
        mergedMessages.length > 0
          ? sortWorkOrderThreadMessages(mergedMessages)
          : Array.isArray(workOrder?.threadedMessages) && workOrder.threadedMessages.length > 0
            ? sortWorkOrderThreadMessages(workOrder.threadedMessages)
            : Array.isArray(workOrder?.messages)
              ? sortWorkOrderThreadMessages(workOrder.messages.map(mapLegacyWorkOrderMessage))
              : []
      )

      // Auto-scroll to bottom after load
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    } catch (err) {
      console.error("Failed to load thread messages:", err)
      setThreadMessages(
        Array.isArray(workOrder?.threadedMessages) && workOrder.threadedMessages.length > 0
          ? sortWorkOrderThreadMessages(workOrder.threadedMessages)
          : Array.isArray(workOrder?.messages)
            ? sortWorkOrderThreadMessages(workOrder.messages.map(mapLegacyWorkOrderMessage))
            : []
      )
    } finally {
      setLoadingThreadMessages(false)
    }
  }

  const getThreadAttachmentHref = (attachmentId: string) => `/messages/attachments/${attachmentId}`
  const getThreadAttachmentPreviewHref = (attachmentId: string) => `/messages/attachments/${attachmentId}?preview=1`

  const openThreadImageViewer = (
    attachments: WorkOrderThreadAttachment[],
    activeAttachmentId: string
  ) => {
    const imageAttachments = attachments.filter((attachment) => attachment.isImage)
    const activeIndex = imageAttachments.findIndex((attachment) => attachment.id === activeAttachmentId)
    if (imageAttachments.length === 0 || activeIndex < 0) return

    setMessageImageViewer({
      images: imageAttachments.map((attachment) => ({
        id: attachment.id,
        url: getThreadAttachmentHref(attachment.id),
        title: attachment.fileName,
      })),
      index: activeIndex,
    })
  }

  const isGeneratedAttachmentSummary = (
    body: string,
    attachments: WorkOrderThreadAttachment[] | undefined
  ) => {
    const safeAttachments = attachments ?? []
    if (safeAttachments.length === 0) return false
    return body.trim() === `📎 ${safeAttachments.map((attachment) => attachment.fileName).join(", ")}`
  }

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && (!messageFiles || messageFiles.length === 0)) || sendingMessage) return
    setSendingMessage(true)
    try {
      const formData = new FormData()
      formData.append("workOrderId", String(params.id))
      formData.append("body", newMessage)
      Array.from(messageFiles ?? []).forEach((file) => formData.append("directFiles", file))

      const response = await fetch("/api/messages/work-order-thread", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        setNewMessage("")
        setMessageFiles(null)
        if (params.id) await fetchThreadMessages(String(params.id))
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
        return
      }

      const threadError = await response.json().catch(() => ({}))
      console.error("Failed to send threaded work order message:", threadError)

      if (!messageFiles || messageFiles.length === 0) {
        const fallbackResponse = await fetch(`/api/work-orders/${params.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newMessage }),
        })

        if (fallbackResponse.ok) {
          setNewMessage("")
          setMessageFiles(null)
          if (params.id) await fetchThreadMessages(String(params.id))
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
          return
        }

        const fallbackError = await fallbackResponse.json().catch(() => ({}))
        console.error("Failed to send legacy work order message:", fallbackError)
      }
    } catch (error) {
      console.error("Error sending work order message:", error)
    } finally {
      setSendingMessage(false)
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

  const handleStatusChange = async (newStatus: string) => {
    if (!workOrder || newStatus === workOrder.status) return

    setSavingStatus(true)

    try {
      const response = await fetch(`/api/work-orders/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result?.error || "Failed to update status")
      }

      setWorkOrder((current) => (current ? { ...current, status: newStatus } : current))
    } catch (error) {
      console.error("Error updating work order status:", error)
      alert(error instanceof Error ? error.message : "Failed to update work order status.")
    } finally {
      setSavingStatus(false)
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

    if (task.taskName && task.taskName.trim()) {
      return task.taskName
    }

    if (task.comments && task.comments.trim()) {
      const compact = task.comments.replace(/\s+/g, " ").trim()
      return compact.length > 72 ? `${compact.slice(0, 72)}...` : compact
    }

    return task.taskType === "Bid" ? "Unnamed Bid Item" : "Unnamed Task"
  }

  const isBidTask = (task: Task) => task.taskType === "Bid" || (task.taskName || "").includes("(Bid)")
  const visibleTaskRows = tasks.filter((task) => !isBidTask(task))
  const visibleTaskContractorTotal = visibleTaskRows.reduce((sum, task) => sum + (task.contractorPrice * task.qty), 0)
  const visibleTaskClientTotal = visibleTaskRows.reduce((sum, task) => sum + (task.clientPrice * task.qty), 0)

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

  const normalizePhotoRequirements = (task: Task): PhotoRequirement[] => {
    const existingRequirements = Array.isArray(task.photoRequirements) ? task.photoRequirements : []
    const defaultRequirements = generatePhotoRequirements(task.taskType, task.id)

    if (!defaultRequirements.length) {
      return existingRequirements
    }

    return defaultRequirements.map((defaultRequirement) => {
      const matchingRequirement = existingRequirements.find(
        (requirement) =>
          requirement.type === defaultRequirement.type ||
          requirement.id === defaultRequirement.id
      )

      return matchingRequirement
        ? {
            ...defaultRequirement,
            ...matchingRequirement,
            uploads: Array.isArray(matchingRequirement.uploads) ? matchingRequirement.uploads : [],
          }
        : defaultRequirement
    })
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

  const handleGenerateAiBid = async (task: Task) => {
    setGeneratingAiBid(true)
    setGeneratingBidRowId(task.id)
    try {
      const response = await fetch(`/api/work-orders/${params.id}/ai-bid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedTask: task,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(
          errorData?.details
            ? `${errorData.error || "Failed to generate AI bid"}: ${errorData.details}`
            : errorData?.error || "Failed to generate AI bid"
        )
      }

      const data = await response.json()
      const generatedBidItem = data?.bidItem
      if (!generatedBidItem) {
        throw new Error("No bid item was generated")
      }

      setTasks((prev) =>
        prev.map((existingTask) =>
          existingTask.id === task.id
            ? {
                ...existingTask,
                ...generatedBidItem,
                id: task.id,
                taskType: "Bid",
                photoRequirements: existingTask.photoRequirements || [],
              }
            : existingTask
        )
      )
    } catch (error) {
      console.error("AI bid generation error:", error)
      alert(error instanceof Error ? error.message : "Failed to generate AI bid")
    } finally {
      setGeneratingAiBid(false)
      setGeneratingBidRowId(null)
    }
  }

  const handleSaveTasks = async (options?: { validateBids?: boolean }) => {
    if (options?.validateBids) {
      const bidTasks = tasks.filter(task => task.taskType === "Bid")
      const invalidBidTasks = bidTasks.filter(task => {
        const displayName = getTaskDisplayName(task)
        const hasValidTaskName = displayName && displayName.trim() !== "" && displayName !== "Select Task..."

        return !hasValidTaskName || task.qty <= 0 || task.clientPrice <= 0
      })

      if (invalidBidTasks.length > 0) {
        alert("Please complete all bid items:\n- Select a valid task or enter custom task name\n- Enter quantity > 0\n- Enter client price > 0")
        return
      }
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

  const escapeExportHtml = (value: string | number | undefined | null) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")

  const exportCurrency = (value?: number | null) => `$${Number(value || 0).toFixed(2)}`

  const getRequirementUploadsForExport = (task: Task, requirementType: string) => {
    const normalizeRequirementType = (value?: string) => {
      const normalized = String(value || "").toUpperCase()
      return normalized.startsWith("PHOTO_") ? normalized.replace("PHOTO_", "") : normalized
    }

    const normalizedTarget = normalizeRequirementType(requirementType)
    const matchingRequirements = Array.isArray(task.photoRequirements)
      ? task.photoRequirements.filter((item) => {
          const typeMatch = normalizeRequirementType(item.type) === normalizedTarget
          const labelMatch = normalizeRequirementType(item.label) === normalizedTarget
          const idMatch = String(item.id || "").toUpperCase().includes(normalizedTarget)
          return typeMatch || labelMatch || idMatch
        })
      : []

    const requirementIds = matchingRequirements.map((item) => item.id).filter(Boolean)

    const embeddedUploads = matchingRequirements.flatMap((requirement) =>
      Array.isArray(requirement?.uploads) ? requirement.uploads.filter((upload) => upload?.url) : []
    )

    const fileMatches = Array.isArray(workOrder?.files)
      ? workOrder.files.filter((file) => {
          if (file.requirementId && requirementIds.length) {
            return requirementIds.includes(file.requirementId)
          }
          if (file.taskId && file.taskId === task.id && file.category) {
            return normalizeRequirementType(file.category) === normalizedTarget
          }
          return false
        })
      : []

    const merged = [
      ...embeddedUploads.map((upload) => ({ id: upload.id, url: upload.url })),
      ...fileMatches.map((file) => ({ id: file.id, url: file.url })),
    ]

    return merged.filter(
      (item, index, arr) =>
        !!item.url && arr.findIndex((candidate) => candidate.id === item.id || candidate.url === item.url) === index
    )
  }

  const buildExportTaskCardsHtml = (
    taskList: Task[],
    options: {
      title: string
      eyebrow: string
      badgeClass: string
      photoTypes: { type: string; label: string }[]
      emptyMessage: string
    }
  ) => {
    if (taskList.length === 0) {
      return `
        <section class="section">
          <div class="section-head">
            <div>
              <p class="eyebrow">${escapeExportHtml(options.eyebrow)}</p>
              <h2>${escapeExportHtml(options.title)}</h2>
            </div>
          </div>
          <div class="empty-card">${escapeExportHtml(options.emptyMessage)}</div>
        </section>
      `
    }

    return `
      <section class="section">
        <div class="section-head">
          <div>
            <p class="eyebrow">${escapeExportHtml(options.eyebrow)}</p>
            <h2>${escapeExportHtml(options.title)}</h2>
          </div>
          <div class="badge ${options.badgeClass}">${taskList.length} item${taskList.length === 1 ? "" : "s"}</div>
        </div>
        <div class="task-stack">
          ${taskList
            .map((task) => {
              const photoGroups = options.photoTypes
                .map(({ type, label }) => {
                  const uploads = getRequirementUploadsForExport(task, type)
                  if (!uploads.length) return ""

                  const taskDisplayName = getTaskDisplayName(task)

                  return `
                    <div class="photo-subgroup">
                      <div class="photo-item-name">${escapeExportHtml(taskDisplayName)}</div>
                      <div class="photo-subgroup-title">
                        <small>${escapeExportHtml(label)}</small>
                      </div>
                      <div class="photo-grid">
                        ${uploads
                          .map(
                            (upload, index) => `
                              <figure class="photo-card">
                                <div class="photo-shell">
                                  <img src="${escapeExportHtml(upload.url)}" alt="${escapeExportHtml(label)} ${index + 1}" />
                                </div>
                                <figcaption>
                                  <span class="photo-tag">${escapeExportHtml(taskDisplayName)}</span>
                                  <span class="photo-meta">Photo ${index + 1}</span>
                                </figcaption>
                              </figure>
                            `
                          )
                          .join("")}
                      </div>
                    </div>
                  `
                })
                .filter(Boolean)
                .join("")

              return `
                <article class="task-card">
                  <div class="task-card-head">
                    <div>
                      <h3>${escapeExportHtml(getTaskDisplayName(task))}</h3>
                      <p>${escapeExportHtml(task.taskType || "Task")}</p>
                    </div>
                    <div class="task-pill">${escapeExportHtml(task.qty)} ${escapeExportHtml(task.uom || "EACH")}</div>
                  </div>
                  <div class="task-meta">
                    <div><strong>Contractor</strong><span>${exportCurrency(task.contractorPrice)} each</span></div>
                    <div><strong>Client</strong><span>${exportCurrency(task.clientPrice)} each</span></div>
                    <div><strong>Contractor Total</strong><span>${exportCurrency((task.contractorPrice || 0) * (task.qty || 0))}</span></div>
                    <div><strong>Client Total</strong><span>${exportCurrency((task.clientPrice || 0) * (task.qty || 0))}</span></div>
                  </div>
                  <div class="task-comments">
                    <strong>Comments</strong>
                    <span>${escapeExportHtml(task.comments || "No comments provided.")}</span>
                  </div>
                  ${photoGroups || '<div class="empty-card">No tagged photos attached to this item.</div>'}
                </article>
              `
            })
            .join("")}
        </div>
      </section>
    `
  }

  const handleExportWorkOrderPdf = () => {
    if (!workOrder) {
      alert("Work order details are still loading.")
      return
    }

    const inspectionTasks = tasks.filter((task) => task.taskType === "Inspection")
    const bidTasks = tasks.filter((task) => task.taskType === "Bid")
    const completionTasks = tasks.filter((task) => task.taskType !== "Bid" && task.taskType !== "Inspection")

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeExportHtml(`${workOrder.workOrderNumber || workOrder.id} Work Order`)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #f3f6fb;
              color: #14213d;
              font-family: "Helvetica Neue", Arial, sans-serif;
            }
            .page { max-width: 1120px; margin: 0 auto; padding: 28px; }
            .hero {
              background: linear-gradient(135deg, #14213d 0%, #1e3057 100%);
              color: #fff;
              border-radius: 24px;
              padding: 28px 32px;
              margin-bottom: 22px;
            }
            .eyebrow {
              margin: 0 0 8px;
              font-size: 12px;
              letter-spacing: .16em;
              text-transform: uppercase;
              color: #9fb7ff;
            }
            h1 { margin: 0; font-size: 34px; line-height: 1.05; }
            .hero-sub {
              margin-top: 12px;
              color: #d6e1ff;
              font-size: 15px;
              line-height: 1.6;
              max-width: 760px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 14px;
              margin-top: 22px;
            }
            .summary-card {
              background: rgba(255,255,255,.08);
              border: 1px solid rgba(255,255,255,.12);
              border-radius: 18px;
              padding: 14px 16px;
            }
            .summary-label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: .08em;
              color: #b9c9f6;
              margin-bottom: 6px;
            }
            .summary-value {
              font-size: 15px;
              font-weight: 700;
              color: #fff;
              line-height: 1.45;
            }
            .section {
              background: #fff;
              border: 1px solid #dbe3f2;
              border-radius: 24px;
              padding: 22px;
              margin-bottom: 18px;
              box-shadow: 0 12px 30px rgba(20, 33, 61, .06);
            }
            .section-head {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 16px;
              margin-bottom: 18px;
            }
            h2 { margin: 0; font-size: 24px; color: #14213d; }
            h3 { margin: 0; font-size: 20px; color: #18263f; }
            .badge {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              border-radius: 999px;
              padding: 8px 12px;
              font-size: 12px;
              font-weight: 700;
            }
            .badge.blue { background: #dce8ff; color: #2750a5; }
            .badge.green { background: #d9f4df; color: #2f7e42; }
            .badge.orange { background: #ffe3d6; color: #b44f1f; }
            .overview-grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 14px;
            }
            .overview-card {
              background: #f7f9fd;
              border: 1px solid #dde6f4;
              border-radius: 18px;
              padding: 16px;
            }
            .overview-card strong {
              display: block;
              margin-bottom: 8px;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: .06em;
              color: #64748b;
            }
            .overview-card span {
              display: block;
              font-size: 15px;
              line-height: 1.6;
              color: #18263f;
            }
            .task-stack { display: flex; flex-direction: column; gap: 16px; }
            .task-card {
              border: 1px solid #e1e8f4;
              border-radius: 20px;
              padding: 18px;
              background: #f9fbff;
            }
            .task-card-head {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              margin-bottom: 14px;
            }
            .task-card-head p {
              margin: 4px 0 0;
              color: #667892;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: .06em;
            }
            .task-pill {
              align-self: flex-start;
              border-radius: 999px;
              background: #e8eefb;
              color: #294064;
              font-size: 13px;
              font-weight: 700;
              padding: 9px 12px;
            }
            .task-meta {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 16px;
            }
            .task-meta div, .task-comments {
              background: #fff;
              border: 1px solid #e1e8f4;
              border-radius: 16px;
              padding: 12px 14px;
            }
            .task-meta strong, .task-comments strong {
              display: block;
              margin-bottom: 6px;
              font-size: 11px;
              letter-spacing: .08em;
              text-transform: uppercase;
              color: #64748b;
            }
            .task-meta span, .task-comments span {
              display: block;
              color: #1b2741;
              line-height: 1.55;
              white-space: pre-wrap;
            }
            .photo-subgroup + .photo-subgroup { margin-top: 16px; }
            .photo-item-name {
              display: inline-block;
              margin-bottom: 10px;
              padding: 8px 12px;
              border-radius: 999px;
              background: #eef4ff;
              color: #18325b;
              font-size: 16px;
              font-weight: 800;
              letter-spacing: .01em;
            }
            .photo-subgroup-title {
              display: flex;
              flex-direction: column;
              gap: 2px;
              margin-bottom: 10px;
            }
            .photo-subgroup-title small {
              font-size: 11px;
              font-weight: 700;
              color: #6d7f9f;
              text-transform: uppercase;
              letter-spacing: .08em;
            }
            .photo-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 14px;
            }
            .photo-card {
              margin: 0;
              border: 1px solid #dbe4f1;
              border-radius: 18px;
              padding: 12px;
              background: #fff;
            }
            .photo-shell {
              height: 180px;
              border-radius: 14px;
              overflow: hidden;
              background: #dfe7f5;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .photo-shell img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            }
            figcaption {
              display: flex;
              justify-content: space-between;
              gap: 8px;
              margin-top: 10px;
              font-size: 12px;
              color: #5c6e8e;
            }
            .photo-tag { font-weight: 700; color: #21395f; }
            .empty-card {
              border: 1px dashed #c8d4e7;
              border-radius: 18px;
              background: #f8fbff;
              padding: 18px;
              color: #5f718f;
              font-size: 14px;
            }
            @media print {
              body { background: #fff; }
              .page { padding: 0; }
              .section, .hero, .task-card { break-inside: avoid; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <section class="hero">
              <p class="eyebrow">Work Order Export</p>
              <h1>${escapeExportHtml(workOrder.workOrderNumber || workOrder.id)}</h1>
              <div class="hero-sub">${escapeExportHtml(workOrder.description || workOrder.title || "Work order export")}</div>
              <div class="summary-grid">
                <div class="summary-card">
                  <div class="summary-label">Address</div>
                  <div class="summary-value">${escapeExportHtml(`${workOrder.addressLine1}, ${workOrder.city}, ${workOrder.state} ${workOrder.postalCode}`)}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">Client</div>
                  <div class="summary-value">${escapeExportHtml(workOrder.client.name || "Unassigned")}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">Contractor</div>
                  <div class="summary-value">${escapeExportHtml(workOrder.assignedContractor?.name || "Unassigned")}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">Status</div>
                  <div class="summary-value">${escapeExportHtml(workOrder.status.replaceAll("_", " "))}</div>
                </div>
              </div>
            </section>

            <section class="section">
              <div class="section-head">
                <div>
                  <p class="eyebrow">Overview</p>
                  <h2>Work Order Summary</h2>
                </div>
                <div class="badge blue">${escapeExportHtml(workOrder.serviceType || "Service")}</div>
              </div>
              <div class="overview-grid">
                <div class="overview-card"><strong>Due Date</strong><span>${escapeExportHtml(formatOptionalDisplayDate(workOrder.dueDate))}</span></div>
                <div class="overview-card"><strong>Estimated Date</strong><span>${escapeExportHtml(formatOptionalDisplayDate(workOrder.estimatedDate))}</span></div>
                <div class="overview-card"><strong>Total Files</strong><span>${escapeExportHtml(String(workOrder.files?.length || 0))}</span></div>
                <div class="overview-card"><strong>Messages</strong><span>${escapeExportHtml(String(workOrder.messages?.length || 0))}</span></div>
              </div>
            </section>

            ${buildExportTaskCardsHtml(inspectionTasks, {
              title: "Inspection Items",
              eyebrow: "Inspection",
              badgeClass: "blue",
              photoTypes: [{ type: "INSPECTION", label: "Inspection Photos" }],
              emptyMessage: "No inspection items were found for this work order.",
            })}
            ${buildExportTaskCardsHtml(bidTasks, {
              title: "Bid Items",
              eyebrow: "Bid",
              badgeClass: "green",
              photoTypes: [{ type: "BID", label: "Bid Photos" }],
              emptyMessage: "No bid items were found for this work order.",
            })}
            ${buildExportTaskCardsHtml(completionTasks, {
              title: "Task / Completion Items",
              eyebrow: "Completion",
              badgeClass: "orange",
              photoTypes: [
                { type: "BEFORE", label: "Before Photos" },
                { type: "DURING", label: "During Photos" },
                { type: "AFTER", label: "After Photos" },
              ],
              emptyMessage: "No completion/task items were found for this work order.",
            })}
          </div>
          <script>
            window.onload = function () {
              window.focus();
              setTimeout(function () { window.print(); }, 250);
            };
          </script>
        </body>
      </html>
    `

    const printFrame = document.createElement("iframe")
    printFrame.style.position = "fixed"
    printFrame.style.right = "0"
    printFrame.style.bottom = "0"
    printFrame.style.width = "0"
    printFrame.style.height = "0"
    printFrame.style.border = "0"
    document.body.appendChild(printFrame)

    const frameDocument = printFrame.contentWindow?.document
    if (!frameDocument) {
      alert("Unable to open print frame.")
      return
    }

    frameDocument.open()
    frameDocument.write(html)
    frameDocument.close()

    setTimeout(() => {
      printFrame.contentWindow?.focus()
      printFrame.contentWindow?.print()
    }, 400)

    setTimeout(() => {
      printFrame.remove()
    }, 3000)
  }

  const handleExportBidPdf = () => {
    const bidTasks = tasks.filter((task) => task.taskType === "Bid")
    if (!workOrder || bidTasks.length === 0) {
      alert("No bid items available to export.")
      return
    }

    const escaped = (value: string | number | undefined | null) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")

    const lineItemsHtml = bidTasks
      .map((task, index) => {
        const displayName =
          task.taskName === "Other" ? task.customTaskName || "Custom Bid Item" : task.taskName || "Bid Item"
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escaped(displayName)}</td>
            <td>${escaped(task.qty)}</td>
            <td>${escaped(task.uom)}</td>
            <td>$${Number(task.contractorPrice || 0).toFixed(2)}</td>
            <td>$${Number(task.clientPrice || 0).toFixed(2)}</td>
            <td>${escaped(task.comments || "")}</td>
          </tr>
        `
      })
      .join("")

    const docTitle = `${workOrder.workOrderNumber || workOrder.id} Bid`
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escaped(docTitle)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              font-family: "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
            }
            .page {
              max-width: 1100px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 24px;
              padding-bottom: 20px;
              border-bottom: 3px solid #0f172a;
              margin-bottom: 24px;
            }
            .brand {
              font-size: 12px;
              letter-spacing: 0.22em;
              text-transform: uppercase;
              color: #475569;
              margin-bottom: 10px;
            }
            h1 {
              margin: 0;
              font-size: 32px;
              line-height: 1.1;
            }
            .meta, .summary {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px 20px;
              margin-bottom: 24px;
            }
            .card {
              border: 1px solid #cbd5e1;
              border-radius: 14px;
              padding: 16px;
              background: #f8fafc;
            }
            .label {
              display: block;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #64748b;
              margin-bottom: 6px;
            }
            .value {
              font-size: 15px;
              line-height: 1.5;
              white-space: pre-wrap;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            th {
              text-align: left;
              background: #e2e8f0;
              color: #0f172a;
              font-size: 12px;
              letter-spacing: 0.04em;
              text-transform: uppercase;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 12px;
              vertical-align: top;
              font-size: 13px;
              line-height: 1.45;
            }
            .totals {
              margin-top: 20px;
              margin-left: auto;
              width: 320px;
              border: 1px solid #cbd5e1;
              border-radius: 14px;
              overflow: hidden;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 12px 16px;
              border-bottom: 1px solid #cbd5e1;
              background: #fff;
            }
            .totals-row:last-child {
              border-bottom: 0;
              background: #0f172a;
              color: #fff;
              font-weight: 700;
            }
            .footer {
              margin-top: 32px;
              padding-top: 16px;
              border-top: 1px solid #cbd5e1;
              color: #64748b;
              font-size: 12px;
            }
            @media print {
              body { padding: 0; }
              .page { max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div>
                <div class="brand">Property Preservation Bid</div>
                <h1>${escaped(workOrder.title)}</h1>
              </div>
              <div class="card" style="min-width: 280px;">
                <span class="label">Bid Summary</span>
                <div class="value">
                  Work Order: ${escaped(workOrder.workOrderNumber || workOrder.id)}<br />
                  Date: ${escaped(new Date().toLocaleDateString())}<br />
                  Due: ${escaped(workOrder.dueDate ? new Date(workOrder.dueDate).toLocaleDateString() : "Not set")}<br />
                  Service Type: ${escaped(workOrder.serviceType)}
                </div>
              </div>
            </div>

            <div class="meta">
              <div class="card">
                <span class="label">Property</span>
                <div class="value">${escaped(workOrder.addressLine1)}, ${escaped(workOrder.city)}, ${escaped(workOrder.state)} ${escaped(workOrder.postalCode)}</div>
              </div>
              <div class="card">
                <span class="label">Client</span>
                <div class="value">${escaped(workOrder.client.name)}${workOrder.client.company ? `<br />${escaped(workOrder.client.company)}` : ""}</div>
              </div>
              <div class="card">
                <span class="label">Assigned Contractor</span>
                <div class="value">${escaped(workOrder.assignedContractor?.name || "Unassigned")}</div>
              </div>
              <div class="card">
                <span class="label">Status</span>
                <div class="value">${escaped(workOrder.status)}</div>
              </div>
            </div>

            <div class="card" style="margin-bottom: 24px;">
              <span class="label">Work Order Description</span>
              <div class="value">${escaped(workOrder.description || "No description provided.")}</div>
            </div>

            <div class="card">
              <span class="label">Bid Line Items</span>
              <table>
                <thead>
                  <tr>
                    <th style="width: 48px;">#</th>
                    <th style="width: 220px;">Item</th>
                    <th style="width: 72px;">Qty</th>
                    <th style="width: 84px;">UOM</th>
                    <th style="width: 110px;">Contractor</th>
                    <th style="width: 110px;">Client</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>${lineItemsHtml}</tbody>
              </table>
            </div>

            <div class="totals">
              <div class="totals-row">
                <span>Bid Item Count</span>
                <span>${bidCount}</span>
              </div>
              <div class="totals-row">
                <span>Contractor Total</span>
                <span>$${bidContractorTotal.toFixed(2)}</span>
              </div>
              <div class="totals-row">
                <span>Client Total</span>
                <span>$${bidClientTotal.toFixed(2)}</span>
              </div>
            </div>

            <div class="footer">
              Generated from the bid section on ${escaped(new Date().toLocaleString())}. Use the browser print dialog and choose “Save as PDF” for export.
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `

    const printFrame = document.createElement("iframe")
    printFrame.style.position = "fixed"
    printFrame.style.right = "0"
    printFrame.style.bottom = "0"
    printFrame.style.width = "0"
    printFrame.style.height = "0"
    printFrame.style.border = "0"
    document.body.appendChild(printFrame)

    const frameDoc = printFrame.contentWindow?.document
    if (!frameDoc || !printFrame.contentWindow) {
      document.body.removeChild(printFrame)
      alert("Unable to prepare print view.")
      return
    }

    frameDoc.open()
    frameDoc.write(html)
    frameDoc.close()

    const cleanup = () => {
      window.setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame)
        }
      }, 1000)
    }

    printFrame.onload = () => {
      printFrame.contentWindow?.focus()
      printFrame.contentWindow?.print()
      cleanup()
    }
  }

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

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploadingDocuments(true)
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData()
          formData.append("file", file as unknown as Blob)
          formData.append("workOrderId", String(params.id))
          formData.append(
            "category",
            String(file.type || "").toLowerCase().includes("pdf") ? "DOCUMENT_PDF" : "OTHER"
          )

          const res = await fetch("/api/upload", { method: "POST", body: formData })
          if (!res.ok) {
            let errBody: any = {}
            try { errBody = await res.json() } catch {}
            throw new Error(errBody?.error || errBody?.details || `Upload failed (${res.status})`)
          }

          const data = await res.json()
          return data.fileAttachment
        })
      )

      setWorkOrder((current) =>
        current
          ? {
              ...current,
              files: [
                ...uploaded.map((file: any) => ({
                  id: file.id,
                  url: file.url,
                  mimeType: file.mimeType,
                  category: file.category,
                })),
                ...(current.files || []),
              ],
              _count: {
                ...current._count,
                files: (current._count?.files || 0) + uploaded.length,
              },
            }
          : current
      )

      if (documentInputRef.current) {
        documentInputRef.current.value = ""
      }
      await fetchWorkOrder()
    } catch (error) {
      console.error("Document upload error:", error)
      alert((error as Error).message || "Failed to upload document(s)")
    } finally {
      setUploadingDocuments(false)
    }
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

  const saveEditedPhoto = async (
    blob: Blob,
    image: { id?: string; url: string; title?: string; category?: string }
  ) => {
    const formData = new FormData()
    const safeName = (image.title || "edited-photo").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()

    formData.append(
      "file",
      new window.File([blob], `${safeName || "edited-photo"}-edited.png`, { type: "image/png" })
    )

    const response = image.id
      ? await fetch(`/api/upload/${image.id}`, {
          method: "PUT",
          body: formData,
        })
      : await (async () => {
          const existingFile = workOrder?.files?.find((file) => file.id === image.id)
          formData.append("workOrderId", params.id as string)
          formData.append("category", image.category || existingFile?.category || "OTHER")
          return fetch("/api/upload", {
            method: "POST",
            body: formData,
          })
        })()

    if (!response.ok) {
      throw new Error("Failed to save edited photo")
    }

    const data = await response.json()
    const updatedFile = {
      id: data?.fileAttachment?.id || image.id,
      url: data?.fileAttachment?.url || image.url,
      mimeType: data?.fileAttachment?.mimeType || "image/png",
      category: data?.fileAttachment?.category || image.category || "OTHER",
    }

    setWorkOrder((prev) =>
      prev
        ? {
            ...prev,
            files: Array.isArray(prev.files)
              ? prev.files.some((file) => file.id === updatedFile.id)
                ? prev.files.map((file) => (file.id === updatedFile.id ? { ...file, ...updatedFile } : file))
                : [updatedFile as any, ...prev.files]
              : [updatedFile as any],
          }
        : prev
    )
    setTasks((prev) =>
      prev.map((task) => ({
        ...task,
        photoRequirements: Array.isArray(task.photoRequirements)
          ? task.photoRequirements.map((requirement) => ({
              ...requirement,
              uploads: Array.isArray(requirement.uploads)
                ? requirement.uploads.map((upload) =>
                    upload?.id === updatedFile.id ? { ...upload, url: updatedFile.url } : upload
                  )
                : requirement.uploads,
            }))
          : task.photoRequirements,
      }))
    )
    await fetchWorkOrder()
    return {
      id: updatedFile.id,
      url: updatedFile.url,
      title: image.title,
      category: updatedFile.category,
    }
  }

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
    return null
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
    <div className="space-y-6 text-[var(--foreground)]">
      {/* Top Navigation Bar */}
      <div className="rounded-[30px] border border-[rgba(194,204,234,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,248,255,0.98)_100%)] p-5 shadow-[0_24px_70px_rgba(145,160,204,0.18)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <select
              value={workOrder.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={savingStatus}
              className="rounded-2xl border border-[rgba(194,204,234,0.9)] bg-white px-4 py-2 text-[#24324a] outline-none shadow-[0_10px_24px_rgba(145,160,204,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {workOrderStatusOptions.map((statusOption) => (
                <option key={statusOption.value} value={statusOption.value}>
                  {statusOption.label}
                </option>
              ))}
            </select>
            <span className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-[0_12px_30px_rgba(255,107,60,0.18)] ${getStatusColor(workOrder.status)}`}>
              {savingStatus ? "Saving..." : workOrderStatusOptions.find((option) => option.value === workOrder.status)?.label || workOrder.status}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyWorkOrder}
              className="rounded-2xl border border-[rgba(194,204,234,0.9)] bg-white px-4 py-2 text-sm text-[#4f5f82] shadow-[0_10px_24px_rgba(145,160,204,0.12)] hover:bg-[#f7f8ff] hover:text-[#24324a] flex items-center"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </button>
            <button
              onClick={handleExportWorkOrderPdf}
              className="rounded-2xl bg-[linear-gradient(180deg,#3f84ff_0%,#2f6ee6_100%)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(47,110,230,0.26)] hover:brightness-105 flex items-center"
            >
              <Printer className="h-4 w-4 mr-1" />
              Export WO
            </button>
            <Link
              href={`/dashboard/admin/work-orders/${params.id}/edit`}
              className="rounded-2xl border border-[rgba(194,204,234,0.9)] bg-white px-4 py-2 text-sm text-[#4f5f82] shadow-[0_10px_24px_rgba(145,160,204,0.12)] hover:bg-[#f7f8ff] hover:text-[#24324a] flex items-center"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Link>
            <button
              onClick={handleDeleteWorkOrder}
              className="rounded-2xl border border-[rgba(194,204,234,0.9)] bg-white px-4 py-2 text-sm text-[#4f5f82] shadow-[0_10px_24px_rgba(145,160,204,0.12)] hover:bg-[#f7f8ff] hover:text-[#24324a] flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </button>
            <button
              onClick={handleOpenBidInvoice}
              className="rounded-2xl border border-[rgba(194,204,234,0.9)] bg-white px-4 py-2 text-sm text-[#4f5f82] shadow-[0_10px_24px_rgba(145,160,204,0.12)] hover:bg-[#f7f8ff] hover:text-[#24324a] flex items-center"
            >
              <DollarSign className="h-4 w-4 mr-1" />
              Bid/Invoice
            </button>
            <button 
              onClick={() => setShowCreateBid(true)}
              className="rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_30px_rgba(255,107,60,0.28)] hover:brightness-105 flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Create Bid
            </button>
            <button
              onClick={handleOpenPropertyHistory}
              className="rounded-2xl border border-[rgba(194,204,234,0.9)] bg-white px-4 py-2 text-sm text-[#4f5f82] shadow-[0_10px_24px_rgba(145,160,204,0.12)] hover:bg-[#f7f8ff] hover:text-[#24324a] flex items-center"
            >
              <FileText className="h-4 w-4 mr-1" />
              Property History
            </button>
            <button
              onClick={handleOpenMap}
              className="rounded-2xl border border-[rgba(194,204,234,0.9)] bg-white px-4 py-2 text-sm text-[#4f5f82] shadow-[0_10px_24px_rgba(145,160,204,0.12)] hover:bg-[#f7f8ff] hover:text-[#24324a] flex items-center"
            >
              <MapPin className="h-4 w-4 mr-1" />
              Map
            </button>
            <button
              onClick={handleOpenMessages}
              className="rounded-2xl border border-[rgba(194,204,234,0.9)] bg-white px-4 py-2 text-sm text-[#4f5f82] shadow-[0_10px_24px_rgba(145,160,204,0.12)] hover:bg-[#f7f8ff] hover:text-[#24324a] flex items-center"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Message
            </button>
          </div>
          
          <div>
            <Link href="/dashboard/admin/support" className="text-[#8f39e8] hover:text-[#6f2ed2]">
              Need Help?
            </Link>
          </div>
        </div>
      </div>

      {/* Work Order Summary */}
      <div className="rounded-[30px] border border-[rgba(194,204,234,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,248,255,0.98)_100%)] p-5 shadow-[0_18px_44px_rgba(145,160,204,0.14)]">
        {/* Main Tabs */}
        <div className="mb-5 flex flex-wrap gap-2">
          <button 
            className={`rounded-2xl px-4 py-2 text-sm font-medium ${
              activeTab === "ipl" ? activeSoftTabClass : "border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
            }`}
            onClick={() => setActiveTab("ipl")}
          >
            IPL # {workOrder.workOrderNumber || workOrder.id}
          </button>
          <button 
            className={`rounded-2xl px-4 py-2 text-sm font-medium ${
              activeTab === "instructions" ? activeSoftTabClass : "border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
            }`}
            onClick={() => setActiveTab("instructions")}
          >
            Instructions
          </button>
          <button 
            className={`rounded-2xl px-4 py-2 text-sm font-medium ${
              activeTab === "office-results" ? activeSoftTabClass : "border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
            }`}
            onClick={() => setActiveTab("office-results")}
          >
            Office Results
          </button>
          <button 
            className={`rounded-2xl px-4 py-2 text-sm font-medium ${
              activeTab === "field-results" ? activeSoftTabClass : "border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
            }`}
            onClick={() => setActiveTab("field-results")}
          >
            Field Results
          </button>
          <button 
            className={`rounded-2xl px-4 py-2 text-sm font-medium ${
              activeTab === "invoice" ? activeSoftTabClass : "border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
            }`}
            onClick={() => setActiveTab("invoice")}
          >
            Invoice
          </button>
          <button 
            className={`rounded-2xl px-4 py-2 text-sm font-medium ${
              activeTab === "photos" ? activeSoftTabClass : "border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
            }`}
            onClick={() => setActiveTab("photos")}
          >
            Photos({workOrder._count?.files ?? 0})
          </button>
          <button 
            className={`rounded-2xl px-4 py-2 text-sm font-medium ${
              activeTab === "messages" ? activeSoftTabClass : "border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
            }`}
            onClick={() => setActiveTab("messages")}
          >
            Messages({workOrder._count?.messages ?? 0})
          </button>
          <button 
            className={`rounded-2xl px-4 py-2 text-sm font-medium ${
              activeTab === "client-sync" ? activeSoftTabClass : "border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
            }`}
            onClick={() => setActiveTab("client-sync")}
          >
            Client Sync
          </button>
          <button 
            className={`rounded-2xl px-4 py-2 text-sm font-medium ${
              activeTab === "property-info" ? activeSoftTabClass : "border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
            }`}
            onClick={() => setActiveTab("property-info")}
          >
            Property Info
          </button>
        </div>

        {/* Work Order Details */}
        <div className="rounded-[26px] border border-[rgba(194,204,234,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,248,255,0.98)_100%)] p-5 text-[#24324a] shadow-[0_16px_36px_rgba(145,160,204,0.14)]">
          <div className="grid grid-cols-2 gap-6 text-sm md:grid-cols-4">
            <div>
              <span className="font-medium text-[#7080a5]">Work Type:</span>
              <div className="mt-1 text-lg font-semibold text-[#24324a]">{workOrder.serviceType}</div>
            </div>
            <div>
              <span className="font-medium text-[#7080a5]">Work Order No:</span>
              <div className="mt-1 text-lg font-semibold text-[#24324a]">{workOrder.workOrderNumber || workOrder.id}</div>
            </div>
            <div>
              <span className="font-medium text-[#7080a5]">Address:</span>
              <div className="mt-1 text-lg font-semibold text-[#24324a]">{workOrder.addressLine1}</div>
              <div className="text-[#7080a5]">{workOrder.city}, {workOrder.state} {workOrder.postalCode}</div>
            </div>
            <div>
              <span className="font-medium text-[#7080a5]">Client:</span>
              <div className="mt-1 text-lg font-semibold text-[#24324a]">{workOrder.client.name}</div>
            </div>
            <div>
              <span className="font-medium text-[#7080a5]">Contractor:</span>
              <div className="mt-1 text-lg font-semibold text-[#24324a]">{workOrder.assignedContractor?.name || "Unassigned"}</div>
            </div>
            <div>
              <span className="font-medium text-[#7080a5]">Coordinator:</span>
              <div className="mt-1 text-lg font-semibold text-[#24324a]">{workOrder.coordinator?.name || "Unassigned"}</div>
            </div>
            <div>
              <span className="font-medium text-[#7080a5]">Due Date:</span>
              <div className="mt-1 text-lg font-semibold text-[#24324a]">{formatOptionalDisplayDate(workOrder.dueDate)}</div>
            </div>
            <div>
              <span className="font-medium text-[#7080a5]">Estimated Date:</span>
              <div className="mt-1 flex items-center text-lg font-semibold text-[#24324a]">
                {formatOptionalDisplayDate(workOrder.estimatedDate)}
                <Calendar className="ml-1 h-4 w-4 text-[#8a96bb]" />
                <FileText className="ml-1 h-4 w-4 text-[#8a96bb]" />
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

        {activeTab === "property-info" && workOrder && (
          <div className="mt-4 rounded-[28px] border border-[rgba(194,204,234,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,248,255,0.98)_100%)] p-6 shadow-[0_18px_40px_rgba(145,160,204,0.14)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(194,204,234,0.72)] pb-5">
              <div>
                <h3 className="text-xl font-semibold text-[#24324a]">Shared Property Information</h3>
                <p className="mt-1 max-w-2xl text-sm text-[#7080a5]">
                  Changes made here update this property across every work order that currently shares the same address fingerprint.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isEditingPropertyInfo ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelPropertyInfoEdit}
                      disabled={savingPropertyInfo}
                      className="rounded-2xl border border-[rgba(194,204,234,0.88)] bg-white px-4 py-2 text-sm font-medium text-[#5f6e94] shadow-[0_8px_18px_rgba(145,160,204,0.1)] transition hover:bg-[#f8faff] disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePropertyInfo}
                      disabled={savingPropertyInfo}
                      className={activeSoftActionClass}
                    >
                      {savingPropertyInfo ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save All Matching Work Orders
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingPropertyInfo(true)}
                    className={activeSoftActionClass.replace(" disabled:opacity-60", "")}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Property Info
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                { key: "addressLine1", label: "Street Address", placeholder: "1414 Redbud Ln" },
                { key: "addressLine2", label: "Address Line 2", placeholder: "Unit / Apt / Suite" },
                { key: "city", label: "City", placeholder: "Denver" },
                { key: "state", label: "State", placeholder: "CO" },
                { key: "postalCode", label: "ZIP Code", placeholder: "80202" },
                { key: "lockCode", label: "Lockbox Code", placeholder: "Lockbox code" },
                { key: "lockLocation", label: "Lockbox Location", placeholder: "Front rail / side gate" },
                { key: "keyCode", label: "Key Code", placeholder: "Key code" },
                { key: "gateCode", label: "Gate Code", placeholder: "Gate code" },
                { key: "lotSize", label: "Lot Size", placeholder: "10000 sqft" },
                { key: "gpsLat", label: "GPS Latitude", placeholder: "39.7392" },
                { key: "gpsLon", label: "GPS Longitude", placeholder: "-104.9903" },
              ].map((field) => (
                <label key={field.key} className="space-y-2">
                  <span className="text-sm font-medium text-[#5a678a]">{field.label}</span>
                  <input
                    type="text"
                    value={propertyInfoForm[field.key as keyof PropertyInfoFormState]}
                    onChange={(event) => handlePropertyInfoChange(field.key as keyof PropertyInfoFormState, event.target.value)}
                    readOnly={!isEditingPropertyInfo}
                    placeholder={field.placeholder}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                      isEditingPropertyInfo
                        ? "border-[rgba(188,198,228,0.9)] bg-white text-[#24324a] shadow-[0_10px_24px_rgba(145,160,204,0.12)] focus:border-[#a56cff] focus:ring-2 focus:ring-[rgba(165,108,255,0.16)]"
                        : "border-[rgba(208,216,238,0.9)] bg-[rgba(248,250,255,0.98)] text-[#5f6e94]"
                    }`}
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 rounded-[24px] border border-[rgba(194,204,234,0.72)] bg-[rgba(248,250,255,0.96)] p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c97ba]">Current work order</div>
                  <div className="mt-2 text-lg font-semibold text-[#24324a]">{workOrder.workOrderNumber || workOrder.id}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c97ba]">Service type</div>
                  <div className="mt-2 text-lg font-semibold text-[#24324a]">{workOrder.serviceType.replaceAll("_", " ")}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c97ba]">Update behavior</div>
                  <div className="mt-2 text-sm font-medium text-[#5f6e94]">Saving here updates all work orders sharing this property.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Work Order Details Section */}
        <div className="mt-4" ref={workOrderDetailsRef}>
          <div 
            className="flex cursor-pointer items-center justify-between rounded-t-[30px] border border-[rgba(194,204,234,0.88)] bg-[radial-gradient(circle_at_top_left,rgba(255,143,216,0.14),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,248,255,0.98)_100%)] px-6 py-5 shadow-[0_18px_40px_rgba(145,160,204,0.14)]"
            onClick={() => setShowWorkOrderDetails(!showWorkOrderDetails)}
          >
            <div>
              <h3 className="text-lg font-semibold text-[#24324a]">Work Order Details</h3>
              <p className="mt-1 text-sm text-[#7080a5]">Manage instructions, tasks, photos, bids, invoices, and communication for this order.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-[rgba(194,204,234,0.88)] bg-[rgba(250,244,255,0.96)] px-3 py-1 text-xs font-medium text-[#7c3aed] md:block">
                Admin Workspace
              </div>
              {showWorkOrderDetails ? <ChevronUp className="h-5 w-5 text-[#8f39e8]" /> : <ChevronDown className="h-5 w-5 text-[#8f39e8]" />}
            </div>
          </div>
          
          {showWorkOrderDetails && (
            <div className="overflow-hidden rounded-b-[30px] border-x border-b border-[rgba(194,204,234,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,248,255,0.98)_100%)] text-[#24324a] shadow-[0_24px_70px_rgba(145,160,204,0.16)]">
              {/* Sub Tabs */}
              <div className="border-b border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.94)] p-4">
                <div className="flex flex-wrap gap-2 rounded-[24px] border border-[rgba(194,204,234,0.88)] bg-white p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <button 
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                    activeSubTab === "instructions" ? activeSoftTabClass : "border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
                  }`}
                  onClick={() => setActiveSubTab("instructions")}
                >
                  Instructions
                </button>
                <button 
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                    activeSubTab === "task" ? activeSoftTabClass : "border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
                  }`}
                  onClick={() => setActiveSubTab("task")}
                >
                  Task
                </button>
                <button 
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                    activeSubTab === "photos" ? activeSoftTabClass : "border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
                  }`}
                  onClick={() => setActiveSubTab("photos")}
                >
                  Photos
                </button>
                <button 
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                    activeSubTab === "bid" ? activeSoftTabClass : "border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
                  }`}
                  onClick={() => setActiveSubTab("bid")}
                >
                  Bid
                </button>
                <button 
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                    activeSubTab === "invoice" ? activeSoftTabClass : "border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
                  }`}
                  onClick={() => setActiveSubTab("invoice")}
                >
                  Invoice
                </button>
                <button 
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                    activeSubTab === "comments" ? activeSoftTabClass : "border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
                  }`}
                  onClick={() => setActiveSubTab("comments")}
                >
                  Comments
                </button>
                <button 
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                    activeSubTab === "correction" ? activeSoftTabClass : "border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] text-[#6f7da1] hover:bg-white hover:text-[#24324a]"
                  }`}
                  onClick={() => setActiveSubTab("correction")}
                >
                  Information/Correction Needed
                </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeSubTab === "instructions" && (
                  <div>
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-semibold text-[#24324a]">Instruction Editor</h4>
                        <p className="mt-1 text-sm text-[#7080a5]">Write field-ready notes with structure, links, and media that the team can act on immediately.</p>
                      </div>
                      <div className="rounded-full border border-[rgba(194,204,234,0.88)] bg-[linear-gradient(135deg,rgba(255,236,248,0.96)_0%,rgba(234,241,255,0.96)_100%)] px-3 py-1 text-xs font-medium text-[#7c3aed]">
                        Live Rich Text
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="overflow-hidden rounded-[30px] border border-[rgba(194,204,234,0.88)] bg-[radial-gradient(circle_at_top,rgba(255,143,216,0.12),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,248,255,0.98)_100%)] shadow-[0_20px_50px_rgba(145,160,204,0.16)]">
                        {/* TipTap Toolbar */}
                        <div className="border-b border-[rgba(194,204,234,0.88)] bg-[rgba(250,252,255,0.96)] px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2 text-[#5f6f91]">
                          <button className="rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-3 py-1.5 shadow-[0_8px_20px_rgba(145,160,204,0.10)] hover:bg-[#f7f8ff] hover:text-[#24324a]" onClick={() => editor?.chain().focus().toggleBold().run()}>B</button>
                          <button className="rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-3 py-1.5 shadow-[0_8px_20px_rgba(145,160,204,0.10)] hover:bg-[#f7f8ff] hover:text-[#24324a]" onClick={() => editor?.chain().focus().toggleItalic().run()}>I</button>
                          <button 
                            className="rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-3 py-1.5 text-sm font-bold shadow-[0_8px_20px_rgba(145,160,204,0.10)] hover:bg-[#f7f8ff] hover:text-[#24324a]" 
                            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                            title="Heading 1"
                          >
                            H1
                          </button>
                          <button 
                            className="rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-3 py-1.5 text-sm font-bold shadow-[0_8px_20px_rgba(145,160,204,0.10)] hover:bg-[#f7f8ff] hover:text-[#24324a]" 
                            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                            title="Heading 2"
                          >
                            H2
                          </button>
                          <button 
                            className="rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-3 py-1.5 text-sm font-bold shadow-[0_8px_20px_rgba(145,160,204,0.10)] hover:bg-[#f7f8ff] hover:text-[#24324a]" 
                            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                            title="Heading 3"
                          >
                            H3
                          </button>
                          <button 
                            className="rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-3 py-1.5 text-sm shadow-[0_8px_20px_rgba(145,160,204,0.10)] hover:bg-[#f7f8ff] hover:text-[#24324a]" 
                            onClick={() => editor?.chain().focus().setParagraph().run()}
                            title="Paragraph"
                          >
                            P
                          </button>
                          <button className="rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-3 py-1.5 shadow-[0_8px_20px_rgba(145,160,204,0.10)] hover:bg-[#f7f8ff] hover:text-[#24324a]" onClick={() => editor?.chain().focus().toggleBulletList().run()}>•</button>
                          <button className="rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-3 py-1.5 shadow-[0_8px_20px_rgba(145,160,204,0.10)] hover:bg-[#f7f8ff] hover:text-[#24324a]" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1.</button>
                          <div className="mx-2 hidden h-6 w-px bg-[rgba(194,204,234,0.88)] md:block" />
                          <button className="rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-3 py-1.5 shadow-[0_8px_20px_rgba(145,160,204,0.10)] hover:bg-[#f7f8ff] hover:text-[#24324a]" onClick={() => {
                            const url = window.prompt("Enter URL")
                            if (!url) return
                            editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
                          }}>🔗</button>
                          <button className="rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-3 py-1.5 shadow-[0_8px_20px_rgba(145,160,204,0.10)] hover:bg-[#f7f8ff] hover:text-[#24324a]" onClick={() => editor?.chain().focus().unsetLink().run()}>❌</button>
                          <button className="rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-3 py-1.5 shadow-[0_8px_20px_rgba(145,160,204,0.10)] hover:bg-[#f7f8ff] hover:text-[#24324a]" onClick={() => {
                            const url = window.prompt("Enter image URL")
                            if (!url) return
                            editor?.chain().focus().setImage({ src: url }).run()
                          }}>🖼️</button>
                          </div>
                          <div className="mt-3 text-xs text-[#7080a5]">
                            Tip: use headings for scope sections and keep contractor-facing instructions short and direct.
                          </div>
                        </div>
                        {/* Editable Area */}
                        <div className="w-full min-h-[260px] bg-[radial-gradient(circle_at_top,rgba(255,143,216,0.08),transparent_22%),linear-gradient(180deg,#fcfdff_0%,#f7f9ff_100%)] p-5">
                          {editor && (
                            <EditorContent 
                              editor={editor} 
                              className="prose prose-sm max-w-none min-h-[240px] text-[#24324a] focus:outline-none [&_.ProseMirror]:min-h-[240px] [&_.ProseMirror]:resize-y [&_.ProseMirror]:overflow-auto [&_.ProseMirror]:rounded-[26px] [&_.ProseMirror]:border [&_.ProseMirror]:border-[rgba(194,204,234,0.88)] [&_.ProseMirror]:bg-white [&_.ProseMirror]:p-7 [&_.ProseMirror]:text-[#24324a] [&_.ProseMirror]:shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] [&_.ProseMirror]:focus:outline-none [&_.ProseMirror_a]:text-[#8f39e8] [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_p]:mb-3 [&_.ProseMirror_ul]:mb-3 [&_.ProseMirror_ol]:mb-3 [&_.ProseMirror_li]:mb-1"
                            />
                          )}
                        </div>
                        <div className="flex items-center justify-between border-t border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] px-5 py-4">
                          <div className="text-xs text-[#7080a5]">
                            Changes are local until you save. Use links and images only when they add field value.
                          </div>
                          <div className="rounded-full border border-[rgba(194,204,234,0.88)] bg-white px-3 py-1 text-xs font-medium text-[#7c3aed]">
                            Ready to publish
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-[#7080a5]">Keep instructions concise and scannable so contractors can execute without re-reading.</p>
                      <button
                        onClick={handleSaveInstructions}
                        disabled={savingInstructions}
                          className="flex items-center rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-5 py-3 text-white shadow-[0_12px_30px_rgba(255,107,60,0.22)] hover:brightness-105 disabled:opacity-60"
                      >
                        {savingInstructions ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Instructions
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {activeSubTab === "task" && (
                  <div>
                    {visibleTaskRows.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.96)] px-4 py-8 text-sm text-[#7080a5]">
                        No non-bid tasks to show in the Task tab.
                      </div>
                    ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-[rgba(194,204,234,0.88)] bg-white">
                        <thead className="bg-[rgba(247,248,255,0.98)]">
                          <tr>
                            <th className="border border-[rgba(194,204,234,0.88)] px-3 py-2 text-left text-sm font-medium text-[#4f5f82]">Task Type</th>
                            <th className="border border-[rgba(194,204,234,0.88)] px-3 py-2 text-left text-sm font-medium text-[#4f5f82]">Task Name</th>
                            <th className="border border-[rgba(194,204,234,0.88)] px-3 py-2 text-left text-sm font-medium text-[#4f5f82]">Qty</th>
                            <th className="border border-[rgba(194,204,234,0.88)] px-3 py-2 text-left text-sm font-medium text-[#4f5f82]">Messages</th>
                            <th className="border border-[rgba(194,204,234,0.88)] px-3 py-2 text-left text-sm font-medium text-[#4f5f82]">
                              Contractor
                              <div className="text-xs font-normal text-[#7080a5]">
                                <div>Price</div>
                                <div>Total Price</div>
                              </div>
                            </th>
                            <th className="border border-[rgba(194,204,234,0.88)] px-3 py-2 text-left text-sm font-medium text-[#4f5f82]">
                              Client
                              <div className="text-xs font-normal text-[#7080a5]">
                                <div>Price</div>
                                <div>Total Price</div>
                              </div>
                            </th>
                            <th className="border border-[rgba(194,204,234,0.88)] px-3 py-2 text-left text-sm font-medium text-[#4f5f82]">Comments</th>
                            <th className="border border-[rgba(194,204,234,0.88)] px-3 py-2 text-left text-sm font-medium text-[#4f5f82]">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleTaskRows.map((task) => (
                            <tr key={task.id} className="bg-white text-[#24324a]">
                              <td className="border border-[rgba(194,204,234,0.88)] px-3 py-2">
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
                                  className="w-full rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-2 py-2 text-sm text-[#24324a]"
                                >
                                  <option value="">Select Task Type</option>
                                  <option value="Completion">Completion</option>
                                  <option value="Bid">Bid</option>
                                  <option value="Inspection">Inspection</option>
                                </select>
                              </td>
                              <td className="border border-[rgba(194,204,234,0.88)] px-3 py-2">
                                <select 
                                  value={task.taskName}
                                  onChange={(e) => {
                                    const updatedTasks = tasks.map(t => 
                                      t.id === task.id ? { ...t, taskName: e.target.value } : t
                                    )
                                    setTasks(updatedTasks)
                                  }}
                                  className="w-full rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-2 py-2 text-sm text-[#24324a]"
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
                              <td className="border border-[rgba(194,204,234,0.88)] px-3 py-2">
                                <input 
                                  type="number" 
                                  value={task.qty}
                                  onChange={(e) => {
                                    const updatedTasks = tasks.map(t => 
                                      t.id === task.id ? { ...t, qty: parseInt(e.target.value) || 1 } : t
                                    )
                                    setTasks(updatedTasks)
                                  }}
                                  className="w-full rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-2 py-2 text-sm text-[#24324a]"
                                />
                              </td>
                              <td className="border border-[rgba(194,204,234,0.88)] px-3 py-2 text-center">
                                <button
                                  onClick={() => {
                                    setShowTaskMessageModal({ taskId: task.id, taskName: getTaskDisplayName(task) })
                                    fetchTaskMessages(task.id)
                                  }}
                                  className="flex items-center justify-center space-x-1 text-[#8fb0ff] hover:text-[#bfd0ff]"
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
                              <td className="border border-[rgba(194,204,234,0.88)] px-3 py-2">
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
                                    className="w-full rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-2 py-2 text-sm text-[#24324a]"
                                    placeholder="$ 0.00"
                                  />
                                  <input 
                                    type="number" 
                                    value={task.contractorPrice * task.qty}
                                    className="w-full rounded-xl border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.98)] px-2 py-2 text-sm text-[#7080a5]"
                                    placeholder="$ 0.00"
                                    readOnly
                                  />
                                </div>
                              </td>
                              <td className="border border-[rgba(194,204,234,0.88)] px-3 py-2">
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
                                    className="w-full rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-2 py-2 text-sm text-[#24324a]"
                                    placeholder="$ 0.00"
                                  />
                                  <input 
                                    type="number" 
                                    value={task.clientPrice * task.qty}
                                    className="w-full rounded-xl border border-[rgba(194,204,234,0.88)] bg-[rgba(247,248,255,0.98)] px-2 py-2 text-sm text-[#7080a5]"
                                    placeholder="$ 0.00"
                                    readOnly
                                  />
                                </div>
                              </td>
                              <td className="border border-[rgba(194,204,234,0.88)] px-3 py-2">
                                <textarea 
                                  value={task.comments}
                                  onChange={(e) => {
                                    const updatedTasks = tasks.map(t => 
                                      t.id === task.id ? { ...t, comments: e.target.value } : t
                                    )
                                    setTasks(updatedTasks)
                                  }}
                                  className="min-h-24 w-full resize-y rounded-xl border border-[rgba(194,204,234,0.88)] bg-white px-3 py-2 text-sm text-[#24324a]"
                                  rows={4}
                                />
                              </td>
                              <td className="border border-[rgba(194,204,234,0.88)] px-3 py-2">
                                <div className="flex items-center space-x-1">
                                  <button className="rounded p-1 text-[#7080a5] hover:bg-[#f7f8ff] hover:text-[#24324a]">
                                    <Copy className="h-4 w-4" />
                                  </button>
                                  <button className="rounded p-1 text-[#7080a5] hover:bg-[#f7f8ff] hover:text-[#24324a]">
                                    <ChevronUp className="h-4 w-4" />
                                  </button>
                                  <button className="rounded p-1 text-[#7080a5] hover:bg-[#f7f8ff] hover:text-[#24324a]">
                                    <ChevronDown className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="rounded p-1 text-[#cf5c8f] hover:bg-[#fff2fb] hover:text-[#a63d74]"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[rgba(247,248,255,0.98)] text-[#24324a]">
                            <td colSpan={3} className="border border-[rgba(194,204,234,0.88)] px-3 py-2 font-medium">
                              Count {visibleTaskRows.length}
                            </td>
                            <td className="border border-[rgba(194,204,234,0.88)] px-3 py-2 text-right font-medium">
                              ${visibleTaskContractorTotal.toFixed(2)}
                            </td>
                            <td className="border border-[rgba(194,204,234,0.88)] px-3 py-2 text-right font-medium">
                              ${visibleTaskClientTotal.toFixed(2)}
                            </td>
                            <td colSpan={2} className="border border-[rgba(194,204,234,0.88)] px-3 py-2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    )}

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
                        onClick={() => handleSaveTasks()}
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
                      <div className="text-sm text-[#9aa6cc]">No tasks yet. Create a task to see photo requirements.</div>
                    ) : (
                      <div className="space-y-6">
                        {/* Download all */}
                        <div className="flex justify-end">
                          <a
                            href={`/api/work-orders/${params.id}/photos/download?scope=all`}
                            className="text-sm text-[#7da2ff] hover:text-[#a9c0ff]"
                          >
                            Download All (ZIP)
                          </a>
                        </div>
                        {tasks.map((task) => (
                          <div key={task.id} className="overflow-hidden rounded-[24px] border border-white/10 bg-[#242c45] shadow-[0_18px_40px_rgba(7,10,20,0.18)]">
                            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                              <div>
                                <div className="text-sm font-semibold text-white">{getTaskDisplayName(task)} <span className="font-normal text-[#9aa6cc]">({task.taskType})</span></div>
                                <div className="text-xs text-[#9aa6cc]">{task.photoRequirements.filter(r => (r.uploads && r.uploads.length > 0)).length} / {task.photoRequirements.length} uploaded</div>
                              </div>
                              <a
                                href={`/api/work-orders/${params.id}/photos/download?scope=task&taskId=${task.id}`}
                                className="text-sm text-[#7da2ff] hover:text-[#a9c0ff]"
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
                                      ? 'border-[#57d2a6]/35 bg-[#1f2941]' 
                                      : 'border-dashed border-white/15 bg-[#1a2135]'
                                  }`}
                                  onDragOver={allowDrop}
                                  onDrop={(e) => handleDrop(e, task.id, requirement.id)}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <div className="font-medium text-sm text-white">
                                        {requirement.label}
                                      </div>
                                      <div className="text-xs text-[#9aa6cc]">
                                        Drag & drop images here or use Upload
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <button onClick={() => handleUploadClick(task.id, requirement.id)} className="text-sm text-[#7da2ff] hover:text-[#a9c0ff]">Upload</button>
                                    </div>
                                  </div>
                                  {/* Thumbnails */}
                                  {requirement.uploads && requirement.uploads.length > 0 && (
                                    <div className="max-h-72 overflow-y-auto pr-1">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-[#dce5ff]">{requirement.uploads.length} photos</span>
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() => handleDeleteAllPhotos(requirement)}
                                            className="text-xs text-[#ff8a6a] underline hover:text-[#ffb19e]"
                                          >
                                            Delete All
                                          </button>
                                          <a
                                            href={`/api/work-orders/${params.id}/photos/download?scope=requirement&requirementId=${requirement.id}`}
                                            className="text-xs text-[#7da2ff] underline hover:text-[#a9c0ff]"
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
                      <h3 className="text-lg font-semibold text-[#edf2ff]">Bid Items</h3>
                      <button
                        onClick={handleAddBidItem}
                        className="rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-4 py-2 text-white shadow-[0_12px_28px_rgba(255,107,60,0.24)] hover:brightness-105 flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Bid Item
                      </button>
                    </div>
                    <div className="overflow-x-auto rounded-[24px] border border-white/10">
                      <table className="min-w-full">
                        <thead className="bg-[#202840]">
                          <tr>
                            <th className="border-b border-r border-white/10 px-3 py-3 text-left text-sm font-semibold text-[#edf2ff]">Task</th>
                            <th className="border-b border-r border-white/10 px-3 py-3 text-left text-sm font-semibold text-[#edf2ff]">Qty</th>
                            <th className="border-b border-r border-white/10 px-3 py-3 text-left text-sm font-semibold text-[#edf2ff]">UOM</th>
                            <th className="border-b border-r border-white/10 px-3 py-3 text-left text-sm font-semibold text-[#edf2ff]">Contractor</th>
                            <th className="border-b border-r border-white/10 px-3 py-3 text-left text-sm font-semibold text-[#edf2ff]">Client</th>
                            <th className="border-b border-r border-white/10 px-3 py-3 text-left text-sm font-semibold text-[#edf2ff]">Comments</th>
                            <th className="border-b border-r border-white/10 px-3 py-3 text-left text-sm font-semibold text-[#edf2ff]">Messages</th>
                            <th className="border-b border-white/10 px-3 py-3 text-left text-sm font-semibold text-[#edf2ff]">Actions</th>
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
                                    onClick={() => handleGenerateAiBid(task)}
                                    disabled={generatingAiBid}
                                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Generate this bid row from sheet"
                                  >
                                    {generatingBidRowId === task.id ? (
                                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-emerald-600" />
                                    ) : (
                                      <Sparkles className="h-4 w-4 text-emerald-600" />
                                    )}
                                  </button>
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
                          <tr className="bg-[#29324d]">
                            <td colSpan={3} className="border-t border-r border-white/10 px-3 py-3 font-semibold text-[#edf2ff]">
                              Count {bidCount}
                            </td>
                            <td className="border-t border-r border-white/10 px-3 py-3 text-right font-semibold text-[#f4d27a]">${bidContractorTotal.toFixed(2)}</td>
                            <td className="border-t border-r border-white/10 px-3 py-3 text-right font-semibold text-[#f4d27a]">${bidClientTotal.toFixed(2)}</td>
                            <td className="border-t border-r border-white/10 px-3 py-3" />
                            <td className="border-t border-r border-white/10 px-3 py-3" />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    
                    <div className="mt-4 flex justify-end gap-3">
                      <button
                        onClick={handleExportBidPdf}
                        className="rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-6 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(255,107,60,0.24)] hover:brightness-105 flex items-center"
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print / Export PDF
                      </button>
                      <button
                        onClick={() => handleSaveTasks({ validateBids: true })}
                        disabled={savingTasks}
                        className="rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-6 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(255,107,60,0.24)] hover:brightness-105 disabled:opacity-60 flex items-center"
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
                    <div className="mb-6 rounded-[24px] border border-white/10 bg-[#1d2438] p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-semibold text-white">Client Invoice</h3>
                          <p className="text-sm text-[#9aa6cc]">Total: ${calculateInvoiceTotal().toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-[#9aa6cc]">Status: <span className="font-medium text-[#edf2ff]">{invoice.status}</span></p>
                        </div>
                        <div className="flex space-x-4">
                          <div>
                            <label className="text-xs text-[#9aa6cc]">Invoice#:</label>
                            <input
                              type="text"
                              value={invoice.invoiceNumber}
                              onChange={(e) => setInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                              className="ml-1 rounded-xl border border-white/10 bg-[#242c45] px-2 py-1 text-sm text-[#edf2ff]"
                              placeholder="2512020"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[#9aa6cc]">Invoice Date:</label>
                            <input
                              type="date"
                              value={invoice.invoiceDate}
                              onChange={(e) => setInvoice(prev => ({ ...prev, invoiceDate: e.target.value }))}
                              className="ml-1 rounded-xl border border-white/10 bg-[#242c45] px-2 py-1 text-sm text-[#edf2ff]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Invoice Items Table */}
                    <div className="overflow-x-auto mb-6">
                      <table className="min-w-full border border-white/10 bg-[#1d2438]">
                        <thead className="bg-[#27304a]">
                          <tr>
                            <th className="border border-white/10 px-3 py-2 text-left text-sm font-medium text-[#d9e2ff]">Item</th>
                            <th className="border border-white/10 px-3 py-2 text-left text-sm font-medium text-[#d9e2ff]">Qty</th>
                            <th className="border border-white/10 px-3 py-2 text-left text-sm font-medium text-[#d9e2ff]">Price</th>
                            <th className="border border-white/10 px-3 py-2 text-left text-sm font-medium text-[#d9e2ff]">Total</th>
                            <th className="border border-white/10 px-3 py-2 text-left text-sm font-medium text-[#d9e2ff]">Adj Price</th>
                            <th className="border border-white/10 px-3 py-2 text-left text-sm font-medium text-[#d9e2ff]">Discount%</th>
                            <th className="border border-white/10 px-3 py-2 text-left text-sm font-medium text-[#d9e2ff]">Final Total</th>
                            <th className="border border-white/10 px-3 py-2 text-left text-sm font-medium text-[#d9e2ff]">Comments</th>
                            <th className="border border-white/10 px-3 py-2 text-left text-sm font-medium text-[#d9e2ff]">Flat Fee</th>
                            <th className="border border-white/10 px-3 py-2 text-left text-sm font-medium text-[#d9e2ff]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoice.items.map((item) => (
                            <tr key={item.id} className="text-[#edf2ff]">
                              <td className="border border-white/10 px-3 py-2">
                                <select
                                  value={item.item}
                                  onChange={(e) => updateInvoiceItem(item.id, 'item', e.target.value)}
                                  className="w-full rounded-xl border border-white/10 bg-[#242c45] px-2 py-2 text-sm text-[#edf2ff]"
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
                              <td className="border border-white/10 px-3 py-2">
                                <input
                                  type="number"
                                  value={item.qty}
                                  onChange={(e) => updateInvoiceItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                                  className="w-full rounded-xl border border-white/10 bg-[#242c45] px-2 py-2 text-sm text-[#edf2ff]"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                              <td className="border border-white/10 px-3 py-2">
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) => updateInvoiceItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-full rounded-xl border border-white/10 bg-[#242c45] px-2 py-2 text-sm text-[#edf2ff]"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                              <td className="border border-white/10 px-3 py-2">
                                <span className="text-sm text-[#dfe6ff]">${item.total.toFixed(2)}</span>
                              </td>
                              <td className="border border-white/10 px-3 py-2">
                                <input
                                  type="number"
                                  value={item.adjPrice}
                                  onChange={(e) => updateInvoiceItem(item.id, 'adjPrice', parseFloat(e.target.value) || 0)}
                                  className="w-full rounded-xl border border-white/10 bg-[#242c45] px-2 py-2 text-sm text-[#edf2ff]"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                              <td className="border border-white/10 px-3 py-2">
                                <input
                                  type="number"
                                  value={item.discountPercent}
                                  onChange={(e) => updateInvoiceItem(item.id, 'discountPercent', parseFloat(e.target.value) || 0)}
                                  className="w-full rounded-xl border border-white/10 bg-[#242c45] px-2 py-2 text-sm text-[#edf2ff]"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                />
                              </td>
                              <td className="border border-white/10 px-3 py-2">
                                <span className="text-sm font-medium text-white">${item.finalTotal.toFixed(2)}</span>
                              </td>
                              <td className="border border-white/10 px-3 py-2">
                                <textarea
                                  value={item.comments}
                                  onChange={(e) => updateInvoiceItem(item.id, 'comments', e.target.value)}
                                  className="min-h-16 w-full resize-y rounded-xl border border-white/10 bg-[#242c45] px-3 py-2 text-sm text-[#edf2ff]"
                                  rows={2}
                                />
                              </td>
                              <td className="border border-white/10 px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.flatFee}
                                  onChange={(e) => updateInvoiceItem(item.id, 'flatFee', e.target.checked)}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="border border-white/10 px-3 py-2">
                                <button
                                  onClick={() => deleteInvoiceItem(item.id)}
                                  className="rounded p-1 hover:bg-white/10"
                                >
                                  <Trash2 className="h-4 w-4 text-[#ff8d7d]" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[#27304a] text-[#edf2ff]">
                            <td colSpan={3} className="border border-white/10 px-3 py-2 font-medium">
                              Total Items: {invoice.items.length}
                            </td>
                            <td className="border border-white/10 px-3 py-2 text-right font-medium">
                              ${invoice.items.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                            </td>
                            <td className="border border-white/10 px-3 py-2 text-right font-medium">
                              ${invoice.items.reduce((sum, item) => sum + item.adjPrice, 0).toFixed(2)}
                            </td>
                            <td className="border border-white/10 px-3 py-2"></td>
                            <td className="border border-white/10 px-3 py-2 text-right font-medium">
                              ${calculateInvoiceTotal().toFixed(2)}
                            </td>
                            <td colSpan={3} className="border border-white/10 px-3 py-2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Invoice Footer */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          <div>
                            <label className="text-sm text-[#9aa6cc]">Sent to Client:</label>
                            <input
                              type="date"
                              value={invoice.sentToClientDate || ''}
                              onChange={(e) => setInvoice(prev => ({ ...prev, sentToClientDate: e.target.value }))}
                              className="ml-2 rounded-xl border border-white/10 bg-[#242c45] px-3 py-1 text-sm text-[#edf2ff]"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-[#9aa6cc]">Complete Date:</label>
                            <input
                              type="date"
                              value={invoice.completeDate || ''}
                              onChange={(e) => setInvoice(prev => ({ ...prev, completeDate: e.target.value }))}
                              className="ml-2 rounded-xl border border-white/10 bg-[#242c45] px-3 py-1 text-sm text-[#edf2ff]"
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
                            <span className="text-sm text-[#dce5ff]">No Charge</span>
                          </label>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={addInvoiceItem}
                            className="flex items-center rounded-2xl bg-[linear-gradient(180deg,#4b7ff7_0%,#3468e8_100%)] px-4 py-2 text-white"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </button>
                          <button 
                            onClick={saveInvoice}
                            className="flex items-center rounded-2xl bg-[linear-gradient(180deg,#46b96f_0%,#2f9a57_100%)] px-4 py-2 text-white"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Invoice
                          </button>
                          <button className="flex items-center rounded-2xl bg-[#49546f] px-4 py-2 text-white">
                            <Printer className="h-4 w-4 mr-2" />
                            Print Client
                          </button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-[#9aa6cc]">Client Total: $</label>
                          <input
                            type="number"
                            value={invoice.clientTotal}
                            onChange={(e) => setInvoice(prev => ({ ...prev, clientTotal: parseFloat(e.target.value) || 0 }))}
                            className="ml-2 rounded-xl border border-white/10 bg-[#242c45] px-3 py-1 text-sm text-[#edf2ff]"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-[#9aa6cc]">Enter Notes:</label>
                          <textarea
                            value={invoice.notes}
                            onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
                            className="mt-1 min-h-20 w-full resize-y rounded-[24px] border border-white/10 bg-[#242c45] px-3 py-2 text-sm text-[#edf2ff]"
                            rows={3}
                          />
                        </div>
                        <div className="flex space-x-4">
                          <div>
                            <label className="text-sm text-[#9aa6cc]">Invoice Date:</label>
                            <input
                              type="date"
                              value={invoice.invoiceDate}
                              onChange={(e) => setInvoice(prev => ({ ...prev, invoiceDate: e.target.value }))}
                              className="ml-2 rounded-xl border border-white/10 bg-[#242c45] px-3 py-1 text-sm text-[#edf2ff]"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-[#9aa6cc]">Invoice#:</label>
                            <input
                              type="text"
                              value={invoice.invoiceNumber}
                              onChange={(e) => setInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                              className="ml-2 rounded-xl border border-white/10 bg-[#242c45] px-3 py-1 text-sm text-[#edf2ff]"
                              placeholder="2512020"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === "comments" && (
                  <div className="flex flex-col gap-0">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white">Work Order Communication</h4>
                        <p className="text-xs text-[#9aa6cc] mt-0.5">Messages between office and contractors for this work order</p>
                      </div>
                      {threadId && (
                        <a
                          href={`/messages?thread=${threadId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#a8b8e8] transition hover:bg-white/10 hover:text-white"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Open in Messages ↗
                        </a>
                      )}
                    </div>

                    {/* Message list */}
                    <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1 mb-4 rounded-[20px] border border-white/8 bg-[#16203a] p-4">
                      {loadingThreadMessages ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-white/10 border-t-[#6c86f7]" />
                          <p className="text-xs text-[#7f8bb0]">Loading messages…</p>
                        </div>
                      ) : visibleThreadMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1e2a48] border border-white/10">
                            <MessageCircle className="h-6 w-6 text-[#6c86f7]" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-white">No messages yet</p>
                            <p className="text-xs text-[#7a8ab5] mt-1">Be the first to send a message about this work order.</p>
                          </div>
                        </div>
                      ) : (
                        visibleThreadMessages.map((msg) => {
                          const isMe = msg.createdByUserId === session?.user?.id || msg.createdByUser?.name === session?.user?.name
                          const authorName = msg.createdByUser?.name ?? msg.authorType ?? "System"
                          const authorRole = msg.createdByUser?.role ?? ""
                          const initials = authorName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
                          const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          const date = new Date(msg.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })
                          const attachments = Array.isArray(msg.attachments) ? msg.attachments : []
                          const displayBody = isGeneratedAttachmentSummary(msg.body, attachments) ? "" : msg.body

                          return (
                            <div key={msg.id} className={`flex items-end gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                              {/* Avatar */}
                              {!isMe && (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2d3f6e] border border-white/10 text-[11px] font-bold text-[#a8c0ff]">
                                  {msg.createdByUser?.avatarUrl ? (
                                    <img src={msg.createdByUser.avatarUrl} alt={authorName} className="h-8 w-8 rounded-full object-cover" />
                                  ) : initials}
                                </div>
                              )}
                              <div className={`flex max-w-[72%] flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                                {/* Name + role */}
                                <div className={`flex items-center gap-1.5 text-[11px] ${isMe ? "flex-row-reverse" : ""}`}>
                                  <span className="font-semibold text-[#c8d6ff]">{isMe ? "You" : authorName}</span>
                                  {authorRole && (
                                    <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-[#8899cc]">
                                      {authorRole}
                                    </span>
                                  )}
                                  <span className="text-[#54607e]">{date} · {time}</span>
                                </div>
                                {displayBody && (
                                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                    isMe
                                      ? "rounded-br-sm bg-[linear-gradient(135deg,#5b6ef7_0%,#4154e8_100%)] text-white shadow-[0_8px_20px_rgba(65,84,232,0.35)]"
                                      : "rounded-bl-sm bg-[#1e2b4a] border border-white/8 text-[#dce6ff]"
                                  }`}>
                                    {displayBody}
                                  </div>
                                )}
                                {attachments.length > 0 && (
                                  <div className={`mt-1 flex max-w-full flex-wrap gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                                    {attachments.map((attachment) =>
                                      attachment.isImage ? (
                                        <button
                                          key={attachment.id}
                                          type="button"
                                          onClick={() => openThreadImageViewer(attachments, attachment.id)}
                                          className="block overflow-hidden rounded-2xl border border-white/10 bg-[#1e2b4a] shadow-[0_10px_26px_rgba(0,0,0,0.18)]"
                                          title={attachment.fileName}
                                        >
                                          <img
                                            src={getThreadAttachmentPreviewHref(attachment.id)}
                                            alt={attachment.fileName}
                                            className="h-28 w-28 object-cover"
                                          />
                                        </button>
                                      ) : (
                                        <a
                                          key={attachment.id}
                                          href={getThreadAttachmentHref(attachment.id)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex max-w-[240px] items-center gap-2 rounded-2xl border border-white/10 bg-[#1e2b4a] px-3 py-2 text-xs font-medium text-[#dce6ff] transition hover:bg-[#243258]"
                                          title={attachment.fileName}
                                        >
                                          <File className="h-3.5 w-3.5 shrink-0 text-[#8fb2ff]" />
                                          <span className="truncate">{attachment.fileName}</span>
                                        </a>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Composer */}
                    <div className="rounded-[20px] border border-white/10 bg-[#1a2340] overflow-hidden">
                      {messageFiles && messageFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 border-b border-white/8 px-4 pt-4 pb-3">
                          {Array.from(messageFiles).map((file, index) => {
                            const isImage = file.type.startsWith("image/")
                            const previewUrl = isImage ? URL.createObjectURL(file) : null

                            return (
                              <div key={`${file.name}-${index}`} className="group relative flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-[#dce6ff] shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
                                {isImage && previewUrl ? (
                                  <img
                                    src={previewUrl}
                                    alt={file.name}
                                    className="h-10 w-10 rounded-xl object-cover"
                                    onLoad={() => URL.revokeObjectURL(previewUrl)}
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#243258]">
                                    <ImageIcon className="h-4 w-4 text-[#8fb2ff]" />
                                  </div>
                                )}
                                <span className="max-w-[180px] truncate">{file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextFiles = new DataTransfer()
                                    Array.from(messageFiles).forEach((currentFile, currentIndex) => {
                                      if (currentIndex !== index) {
                                        nextFiles.items.add(currentFile)
                                      }
                                    })
                                    setMessageFiles(nextFiles.files.length > 0 ? nextFiles.files : null)
                                  }}
                                  className="rounded-full p-1 text-[#8da1cf] transition hover:bg-white/10 hover:text-white"
                                  title="Remove photo"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm text-[#edf2ff] outline-none placeholder:text-[#4e5d80]"
                        rows={3}
                        placeholder="Write a message to the contractor… (Enter to send, Shift+Enter for new line)"
                        disabled={sendingMessage}
                      />
                      <div className="flex items-center justify-between border-t border-white/8 px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => messagePhotoInputRef.current?.click()}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-[#c8d6ff] transition hover:bg-white/10 hover:text-white"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                            Attach Photo
                          </button>
                          <input
                            ref={messagePhotoInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                const nextFiles = new DataTransfer()
                                Array.from(messageFiles ?? []).forEach((file) => nextFiles.items.add(file))
                                Array.from(e.target.files).forEach((file) => nextFiles.items.add(file))
                                setMessageFiles(nextFiles.files)
                              }
                              e.target.value = ""
                            }}
                          />
                          <span className="text-[11px] text-[#4e5d80]">
                            {messageFiles && messageFiles.length > 0
                              ? `${messageFiles.length} photo${messageFiles.length === 1 ? "" : "s"} attached`
                              : newMessage.length > 0
                                ? `${newMessage.length} chars`
                                : "Shift+Enter for new line"}
                          </span>
                        </div>
                        <button
                          onClick={handleSendMessage}
                          disabled={sendingMessage || (!newMessage.trim() && (!messageFiles || messageFiles.length === 0))}
                          className="flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#ff7a49_0%,#ff5e2a_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(255,107,60,0.28)] transition hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendingMessage ? (
                            <>
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              Sending…
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              Send
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(29,35,55,0.96)_0%,rgba(19,24,40,0.96)_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.26)]">
        <div className="border-b border-white/8 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium text-white">Documents & Activity</h3>
              <p className="mt-1 text-sm text-[#95a2c9]">Keep source files, imported attachments, and access history in one place.</p>
            </div>
            <div className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-[#c9d3f2]">
              {(workOrder?.files || []).length} files · {(workOrder?.messages || []).length} comments
            </div>
          </div>
        </div>

        <div className="border-b border-white/8 p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "documents" as const, label: "Documents" },
              { key: "imports" as const, label: "Imported Files" },
              { key: "access" as const, label: "Access Logs" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveOpsTab(tab.key)}
                className={
                  activeOpsTab === tab.key
                    ? "rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-4 py-2 text-sm font-medium text-white"
                    : "rounded-2xl border border-white/8 bg-[#27304a] px-4 py-2 text-sm font-medium text-[#c7d2f3] hover:bg-[#303a58] hover:text-white"
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {activeOpsTab === "documents" && (
            <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[#1f2941]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 bg-[#212b43] px-4 py-3">
                <div className="text-sm text-[#96a4cd]">
                  Upload supporting documents like notices, PDFs, spreadsheets, and field forms.
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={documentInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleDocumentUpload}
                  />
                  <button
                    type="button"
                    onClick={() => documentInputRef.current?.click()}
                    disabled={uploadingDocuments}
                    className="inline-flex items-center rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(255,107,60,0.22)] hover:brightness-105 disabled:opacity-60"
                  >
                    {uploadingDocuments ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Add Document
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-[minmax(0,2.1fr)_180px_180px] border-b border-white/8 bg-[#27304a] px-4 py-3 text-sm font-medium text-[#dce4ff]">
                <div>Document</div>
                <div>Category</div>
                <div>Download</div>
              </div>
              {documentFiles.length > 0 ? (
                documentFiles.map((file) => (
                  <div key={file.id} className="grid grid-cols-[minmax(0,2.1fr)_180px_180px] items-center border-b border-white/8 px-4 py-3 text-sm text-[#edf2ff] last:border-b-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-xl border border-white/8 bg-[#27304a] p-2 text-[#ffb487]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-white">{file.url.split("/").pop() || "Document"}</div>
                        <div className="text-xs text-[#93a1c7]">{file.mimeType || "Unknown file type"}</div>
                      </div>
                    </div>
                    <div className="text-[#c9d4f6]">{file.category || "Document"}</div>
                    <div>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-xl border border-[#7da2ff]/25 bg-[#27304a] px-3 py-2 text-xs font-medium text-[#7da2ff] hover:text-[#a9c0ff]"
                      >
                        <Download className="mr-2 h-3.5 w-3.5" />
                        Download
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-sm text-[#97a5ce]">No document files are attached to this work order yet.</div>
              )}
            </div>
          )}

          {activeOpsTab === "imports" && (
            <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[#1f2941]">
              <div className="grid grid-cols-[minmax(0,2fr)_150px_170px_180px] border-b border-white/8 bg-[#27304a] px-4 py-3 text-sm font-medium text-[#dce4ff]">
                <div>Imported File</div>
                <div>Type</div>
                <div>Imported</div>
                <div>Actions</div>
              </div>
              {importedFiles.length > 0 ? (
                importedFiles.map((file) => (
                  <div key={file.id} className="grid grid-cols-[minmax(0,2fr)_150px_170px_180px] items-center border-b border-white/8 px-4 py-3 text-sm text-[#edf2ff] last:border-b-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-xl border border-white/8 bg-[#27304a] p-2 text-[#8fb0ff]">
                        <File className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-white">{file.url.split("/").pop() || "Imported file"}</div>
                        <div className="text-xs text-[#93a1c7]">{file.category || "General import"}</div>
                      </div>
                    </div>
                    <div className="text-[#c9d4f6]">{file.mimeType?.split("/")[1] || file.mimeType || "file"}</div>
                    <div className="text-[#c9d4f6]">{file.createdAt ? new Date(file.createdAt).toLocaleString() : "Imported"}</div>
                    <div className="flex items-center gap-2">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-xl border border-[#7da2ff]/25 bg-[#27304a] px-3 py-2 text-xs font-medium text-[#7da2ff] hover:text-[#a9c0ff]"
                      >
                        <Eye className="mr-2 h-3.5 w-3.5" />
                        View
                      </a>
                      <a
                        href={file.url}
                        download
                        className="inline-flex items-center rounded-xl border border-white/8 bg-[#27304a] px-3 py-2 text-xs font-medium text-[#dce5ff] hover:text-white"
                      >
                        <Download className="mr-2 h-3.5 w-3.5" />
                        Save
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-sm text-[#97a5ce]">No imported files are available for this work order yet.</div>
              )}
            </div>
          )}

          {activeOpsTab === "access" && (
            <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[#1f2941]">
              <div className="grid grid-cols-[170px_minmax(0,2fr)_170px_170px_170px_180px] border-b border-white/8 bg-[#27304a] px-4 py-3 text-sm font-semibold text-[#dce4ff]">
                <div>Type of Log</div>
                <div>Log Details</div>
                <div>Access Date</div>
                <div>Old Value</div>
                <div>New Value</div>
                <div>Access By</div>
              </div>
              <div className="grid grid-cols-[170px_minmax(0,2fr)_170px_170px_170px_180px] border-b border-white/8 bg-[#212b43] px-4 py-3">
                <div className="pr-3">
                  <input
                    value={accessLogFilters.type || ""}
                    onChange={(e) => setAccessLogFilters((prev) => ({ ...prev, type: e.target.value }))}
                    placeholder="Type"
                    className="w-full rounded-xl border border-white/10 bg-[#27304a] px-3 py-2 text-sm text-[#edf2ff] placeholder:text-[#8090ba]"
                  />
                </div>
                <div className="pr-3">
                  <input
                    value={accessLogFilters.detail || ""}
                    onChange={(e) => setAccessLogFilters((prev) => ({ ...prev, detail: e.target.value }))}
                    placeholder="Log details"
                    className="w-full rounded-xl border border-white/10 bg-[#27304a] px-3 py-2 text-sm text-[#edf2ff] placeholder:text-[#8090ba]"
                  />
                </div>
                <div className="pr-3">
                  <input
                    value={accessLogFilters.accessDate || ""}
                    onChange={(e) => setAccessLogFilters((prev) => ({ ...prev, accessDate: e.target.value }))}
                    placeholder="Date"
                    className="w-full rounded-xl border border-white/10 bg-[#27304a] px-3 py-2 text-sm text-[#edf2ff] placeholder:text-[#8090ba]"
                  />
                </div>
                <div className="pr-3">
                  <input
                    value={accessLogFilters.oldValue || ""}
                    onChange={(e) => setAccessLogFilters((prev) => ({ ...prev, oldValue: e.target.value }))}
                    placeholder="Old value"
                    className="w-full rounded-xl border border-white/10 bg-[#27304a] px-3 py-2 text-sm text-[#edf2ff] placeholder:text-[#8090ba]"
                  />
                </div>
                <div className="pr-3">
                  <input
                    value={accessLogFilters.newValue || ""}
                    onChange={(e) => setAccessLogFilters((prev) => ({ ...prev, newValue: e.target.value }))}
                    placeholder="New value"
                    className="w-full rounded-xl border border-white/10 bg-[#27304a] px-3 py-2 text-sm text-[#edf2ff] placeholder:text-[#8090ba]"
                  />
                </div>
                <div>
                  <input
                    value={accessLogFilters.accessBy || ""}
                    onChange={(e) => setAccessLogFilters((prev) => ({ ...prev, accessBy: e.target.value }))}
                    placeholder="Access by"
                    className="w-full rounded-xl border border-white/10 bg-[#27304a] px-3 py-2 text-sm text-[#edf2ff] placeholder:text-[#8090ba]"
                  />
                </div>
              </div>
              {filteredAccessLogs.length > 0 ? (
                filteredAccessLogs.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-[170px_minmax(0,2fr)_170px_170px_170px_180px] items-start border-b border-white/8 px-4 py-3 text-sm text-[#edf2ff] last:border-b-0">
                    <div className="font-medium text-white">{entry.type}</div>
                    <div className="pr-3 text-[#dbe4ff]">{entry.detail}</div>
                    <div className="text-[#c9d4f6]">{new Date(entry.accessDate).toLocaleDateString()}</div>
                    <div className="text-[#97a5ce]">{entry.oldValue || "-"}</div>
                    <div className="text-[#dbe4ff]">{entry.newValue || "-"}</div>
                    <div className="text-[#dbe4ff]">{entry.accessBy || "-"}</div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-sm text-[#97a5ce]">
                  No access activity has been recorded for this work order yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Property History Section */}
      <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(29,35,55,0.96)_0%,rgba(19,24,40,0.96)_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.26)]" ref={propertyHistoryRef}>
        <div 
          className="flex cursor-pointer items-center justify-between border-b border-white/8 p-4"
          onClick={() => setShowPropertyHistory(!showPropertyHistory)}
        >
          <h3 className="font-medium text-white">Property History</h3>
          {showPropertyHistory ? <ChevronUp className="h-5 w-5 text-[#ffb487]" /> : <ChevronDown className="h-5 w-5 text-[#ffb487]" />}
        </div>
        
        {showPropertyHistory && (
          <div className="bg-[#1b2236] p-4 text-[#edf2ff]">
            <div className="mb-4 flex flex-wrap gap-2">
              {propertyHistoryTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActivePropertyHistoryTab(tab.key)
                    setPropertyHistoryCommentSearch("")
                    setPropertyHistoryFilters({})
                  }}
                  className={
                    activePropertyHistoryTab === tab.key
                      ? "rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-4 py-2 text-sm font-medium text-white"
                      : "rounded-2xl border border-white/8 bg-[#27304a] px-4 py-2 text-sm font-medium text-[#c7d2f3] hover:bg-[#303a58] hover:text-white"
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {(showingBidHistory || showingCompletionHistory) && (
              <div className="mb-4 max-w-md">
                <input
                  type="text"
                  value={propertyHistoryCommentSearch}
                  onChange={(e) => setPropertyHistoryCommentSearch(e.target.value)}
                  placeholder={`Search ${showingBidHistory ? "bid" : "completion"} comments...`}
                  className="w-full rounded-2xl border border-white/10 bg-[#1f2941] px-4 py-2.5 text-sm text-[#edf2ff] outline-none placeholder:text-[#7f8bb1] focus:border-[#ff7a49]/60"
                />
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="min-w-full overflow-hidden rounded-[24px] border border-white/8">
                <thead className="bg-[#27304a]">
                  <tr>
                    {showingBidHistory ? (
                      <>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Action</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">CTIC</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Status</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Work Order #</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Pics</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Work Type</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Contractor</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Date</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Task</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Qty</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Contractor</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Client</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Comments</th>
                      </>
                    ) : showingCompletionHistory ? (
                      <>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Action</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">IPL NO</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Work Order</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Status</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Work Type</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Task</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Qty</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Comments</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Photos</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Contractor</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Due Date</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Address</th>
                      </>
                    ) : showingInvoiceHistory ? (
                      <>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Action</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">IPL NO</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Work Order</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Invoice #</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Invoice Status</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Invoice Total</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Invoice Date</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Address</th>
                      </>
                    ) : (
                      <>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Action</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">IPL NO</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Work Order</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Status</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Work Type</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Photos</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Contractor</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Due Date</th>
                        <th className="border-b border-white/8 px-3 py-2 text-left text-sm font-medium text-[#dce5ff]">Address</th>
                      </>
                    )}
                  </tr>
                  {(showingBidHistory || showingCompletionHistory) && (
                    <tr className="bg-[#212b43]">
                      <th className="border-b border-white/8 px-3 py-2 text-left">
                        <div className="flex items-center gap-2 text-[#7f8bb1]">
                          <Filter className="h-4 w-4" />
                          <span className="text-xs">Filter</span>
                        </div>
                      </th>
                      {showingBidHistory ? (
                        <>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.ctic || ""} onChange={(e) => setPropertyHistoryFilter("ctic", e.target.value)} placeholder="CTIC" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.status || ""} onChange={(e) => setPropertyHistoryFilter("status", e.target.value)} placeholder="Status" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.workOrderNumber || ""} onChange={(e) => setPropertyHistoryFilter("workOrderNumber", e.target.value)} placeholder="Work order #" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.pics || ""} onChange={(e) => setPropertyHistoryFilter("pics", e.target.value)} placeholder="Pics" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.workType || ""} onChange={(e) => setPropertyHistoryFilter("workType", e.target.value)} placeholder="Work type" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.contractor || ""} onChange={(e) => setPropertyHistoryFilter("contractor", e.target.value)} placeholder="Contractor" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.date || ""} onChange={(e) => setPropertyHistoryFilter("date", e.target.value)} placeholder="Date" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.task || ""} onChange={(e) => setPropertyHistoryFilter("task", e.target.value)} placeholder="Task" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.qty || ""} onChange={(e) => setPropertyHistoryFilter("qty", e.target.value)} placeholder="Qty" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.contractorPrice || ""} onChange={(e) => setPropertyHistoryFilter("contractorPrice", e.target.value)} placeholder="Contractor total" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.clientPrice || ""} onChange={(e) => setPropertyHistoryFilter("clientPrice", e.target.value)} placeholder="Client total" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.comments || ""} onChange={(e) => setPropertyHistoryFilter("comments", e.target.value)} placeholder="Comments" className={historyFilterInputClassName} />
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.iplNo || ""} onChange={(e) => setPropertyHistoryFilter("iplNo", e.target.value)} placeholder="IPL NO" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.workOrderNumber || ""} onChange={(e) => setPropertyHistoryFilter("workOrderNumber", e.target.value)} placeholder="Work order #" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.status || ""} onChange={(e) => setPropertyHistoryFilter("status", e.target.value)} placeholder="Status" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.workType || ""} onChange={(e) => setPropertyHistoryFilter("workType", e.target.value)} placeholder="Work type" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.task || ""} onChange={(e) => setPropertyHistoryFilter("task", e.target.value)} placeholder="Task" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.qty || ""} onChange={(e) => setPropertyHistoryFilter("qty", e.target.value)} placeholder="Qty" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.comments || ""} onChange={(e) => setPropertyHistoryFilter("comments", e.target.value)} placeholder="Comments" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.pics || ""} onChange={(e) => setPropertyHistoryFilter("pics", e.target.value)} placeholder="Photos" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.contractor || ""} onChange={(e) => setPropertyHistoryFilter("contractor", e.target.value)} placeholder="Contractor" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.date || ""} onChange={(e) => setPropertyHistoryFilter("date", e.target.value)} placeholder="Date" className={historyFilterInputClassName} />
                          </th>
                          <th className="border-b border-white/8 px-3 py-2">
                            <input value={propertyHistoryFilters.address || ""} onChange={(e) => setPropertyHistoryFilter("address", e.target.value)} placeholder="Address" className={historyFilterInputClassName} />
                          </th>
                        </>
                      )}
                    </tr>
                  )}
                </thead>
                <tbody className="bg-[#1f2941]">
                  {activeHistoryRows.length > 0 ? (
                    activeHistoryRows.map((row) => (
                      <tr key={`${activePropertyHistoryTab}-${row.id}`} className="border-b border-white/8 last:border-b-0">
                        {showingBidHistory ? (
                          <>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href={`/dashboard/admin/work-orders/${row.workOrderId || row.id}`}
                                  className="inline-flex items-center rounded-xl border border-[#7da2ff]/25 bg-[#27304a] px-3 py-1 text-xs font-medium text-[#7da2ff] hover:text-[#a9c0ff]"
                                >
                                  <Eye className="mr-1 h-3.5 w-3.5" />
                                  Open
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(row.task || row.workOrderNumber)}
                                  className="inline-flex items-center rounded-xl border border-white/8 bg-[#27304a] px-3 py-1 text-xs font-medium text-[#dce5ff] hover:text-white"
                                >
                                  <Copy className="mr-1 h-3.5 w-3.5" />
                                  Copy
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.ctic || "-"}</td>
                            <td className="px-3 py-3 text-sm">
                              <span className="inline-flex rounded-xl bg-[#ffb35c]/15 px-3 py-1 text-xs font-semibold text-[#ffd27c] ring-1 ring-[#ffb35c]/20">
                                {row.status}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-sm font-medium text-white">{row.workOrderNumber}</td>
                            <td className="px-3 py-3 text-sm text-[#57d2a6]">{row.pics ?? 0}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{formatHistoryWorkType(row.workType)}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.contractor}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">
                              {row.date ? new Date(row.date).toLocaleDateString() : "-"}
                            </td>
                            <td className="max-w-[240px] px-3 py-3 text-sm text-[#edf2ff]">{row.task || "-"}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.qty ?? 0}</td>
                            <td className="px-3 py-3 text-sm">
                              <div className="rounded-2xl bg-[#22314e] px-3 py-2">
                                <div className="text-[11px] text-[#9aa6cc]">Price: ${(row.contractorPrice || 0).toFixed(2)}</div>
                                <div className="font-semibold text-[#dce5ff]">Total: ${(row.contractorTotal || 0).toFixed(2)}</div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-sm">
                              <div className="rounded-2xl bg-[#243748] px-3 py-2">
                                <div className="text-[11px] text-[#9aa6cc]">Price: ${(row.clientPrice || 0).toFixed(2)}</div>
                                <div className="font-semibold text-white">Total: ${(row.clientTotal || 0).toFixed(2)}</div>
                              </div>
                            </td>
                            <td className="max-w-[280px] px-3 py-3 text-sm text-[#9aa6cc]">
                              {row.comments ? (
                                <span title={row.comments}>
                                  {row.comments.length > 80 ? `${row.comments.slice(0, 80)}... ` : row.comments}
                                  {row.comments.length > 80 && <span className="text-[#7da2ff]">See more</span>}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                          </>
                        ) : showingCompletionHistory ? (
                          <>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href={`/dashboard/admin/work-orders/${row.workOrderId || row.id}`}
                                  className="inline-flex items-center rounded-xl border border-white/8 bg-[#27304a] px-3 py-1.5 text-[#7da2ff] hover:text-[#a9c0ff]"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Open
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(row.task || row.workOrderNumber)}
                                  className="inline-flex items-center rounded-xl border border-white/8 bg-[#27304a] px-3 py-1.5 text-[#dce5ff] hover:text-white"
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.iplNo}</td>
                            <td className="px-3 py-3 text-sm font-medium text-white">{row.workOrderNumber}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.status}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{formatHistoryWorkType(row.workType)}</td>
                            <td className="max-w-[220px] px-3 py-3 text-sm text-[#edf2ff]">{row.task || "-"}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.qty ?? 0}</td>
                            <td className="max-w-[320px] px-3 py-3 text-sm text-[#9aa6cc]">
                              {row.comments ? (
                                <span title={row.comments}>
                                  {row.comments.length > 120 ? `${row.comments.slice(0, 120)}... ` : row.comments}
                                  {row.comments.length > 120 && <span className="text-[#7da2ff]">See more</span>}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.photoCount ?? 0}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.contractor}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">
                              {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "-"}
                            </td>
                            <td className="px-3 py-3 text-sm text-[#9aa6cc]">{row.address}</td>
                          </>
                        ) : showingInvoiceHistory ? (
                          <>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">
                              <Link
                                href={`/dashboard/admin/work-orders/${row.id}`}
                                className="inline-flex items-center rounded-xl border border-white/8 bg-[#27304a] px-3 py-1.5 text-[#7da2ff] hover:text-[#a9c0ff]"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Open
                              </Link>
                            </td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.iplNo}</td>
                            <td className="px-3 py-3 text-sm font-medium text-white">{row.workOrderNumber}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.invoiceNumber || "-"}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.invoiceStatus || "-"}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">${(row.invoiceTotal || 0).toFixed(2)}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">
                              {row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString() : "-"}
                            </td>
                            <td className="px-3 py-3 text-sm text-[#9aa6cc]">{row.address}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">
                              <Link
                                href={`/dashboard/admin/work-orders/${row.id}`}
                                className="inline-flex items-center rounded-xl border border-white/8 bg-[#27304a] px-3 py-1.5 text-[#7da2ff] hover:text-[#a9c0ff]"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Open
                              </Link>
                            </td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.iplNo}</td>
                            <td className="px-3 py-3 text-sm font-medium text-white">{row.workOrderNumber}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.status}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{formatHistoryWorkType(row.workType)}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.photoCount}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.contractor}</td>
                            <td className="px-3 py-3 text-sm text-[#edf2ff]">
                              {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "-"}
                            </td>
                            <td className="px-3 py-3 text-sm text-[#9aa6cc]">{row.address}</td>
                          </>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={showingBidHistory ? 13 : showingCompletionHistory ? 12 : showingInvoiceHistory ? 8 : 9}
                        className="px-3 py-8 text-center text-[#9aa6cc]"
                      >
                        No historical data available for {propertyHistoryTabs.find((tab) => tab.key === activePropertyHistoryTab)?.label.toLowerCase()}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateBid && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0b1020]/75 p-6 backdrop-blur-sm">
          <div className="relative mt-16 w-full max-w-xl rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#232c46_0%,#1a2135_100%)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
            <div className="mt-3">
              <h3 className="mb-4 text-2xl font-semibold text-white">Create New Task</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#dce5ff]">
                    Task Type
                  </label>
                  <select
                    value={newTask.taskType}
                    onChange={(e) => setNewTask(prev => ({ ...prev, taskType: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-[#27304a] px-4 py-3 text-[#edf2ff] outline-none transition focus:border-[#ff6b3c] focus:ring-2 focus:ring-[#ff6b3c]/30 [&>option]:bg-[#1d2438] [&>option]:text-[#edf2ff]"
                  >
                    <option value="">Select Task Type</option>
                    <option value="Completion">Completion</option>
                    <option value="Bid">Bid</option>
                    <option value="Inspection">Inspection</option>
                  </select>
                </div>
                
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#dce5ff]">
                    Task Name
                  </label>
                  <select
                    value={newTask.taskName}
                    onChange={(e) => setNewTask(prev => ({ ...prev, taskName: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-[#27304a] px-4 py-3 text-[#edf2ff] outline-none transition focus:border-[#ff6b3c] focus:ring-2 focus:ring-[#ff6b3c]/30 [&>option]:bg-[#1d2438] [&>option]:text-[#edf2ff]"
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
                  <label className="mb-2 block text-sm font-medium text-[#dce5ff]">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={newTask.qty}
                    onChange={(e) => setNewTask(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                    className="w-full rounded-2xl border border-white/10 bg-[#27304a] px-4 py-3 text-[#edf2ff] placeholder:text-[#8fa0ca] outline-none transition focus:border-[#ff6b3c] focus:ring-2 focus:ring-[#ff6b3c]/30"
                    min="1"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#dce5ff]">
                    Client Price
                  </label>
                  <input
                    type="number"
                    value={newTask.clientPrice}
                    onChange={(e) => setNewTask(prev => ({ ...prev, clientPrice: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-2xl border border-white/10 bg-[#27304a] px-4 py-3 text-[#edf2ff] placeholder:text-[#8fa0ca] outline-none transition focus:border-[#ff6b3c] focus:ring-2 focus:ring-[#ff6b3c]/30"
                    step="0.01"
                    min="0"
                  />
                </div>

                {newTask.taskType && (
                  <div className="rounded-2xl border border-white/10 bg-[#202840] p-4">
                    <h4 className="mb-2 font-medium text-[#ffb487]">Photo Requirements:</h4>
                    <div className="space-y-1">
                      {generatePhotoRequirements(newTask.taskType).map((req) => (
                        <div key={req.id} className="text-sm text-[#dce5ff]">
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
                  className="rounded-2xl border border-white/10 bg-[#27304a] px-5 py-3 text-sm font-medium text-[#dce5ff] transition hover:bg-[#313a58]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleAddTask()
                    setShowCreateBid(false)
                  }}
                  disabled={!newTask.taskType || !newTask.taskName}
                  className="rounded-2xl bg-[linear-gradient(180deg,#d8a83a_0%,#b9851f_100%)] px-5 py-3 text-sm font-medium text-white shadow-[0_12px_28px_rgba(185,133,31,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PhotoEditorModal
        open={lightbox.open}
        images={lightbox.images.map((image, imageIndex) => ({
          id: image.id,
          url: image.url,
          title: `Photo ${imageIndex + 1} of ${lightbox.images.length}`,
          category: workOrder?.files?.find((file) => file.id === image.id)?.category,
        }))}
        index={lightbox.index}
        onClose={closeLightbox}
        onIndexChange={(nextIndex) => setLightbox((prev) => ({ ...prev, index: nextIndex }))}
        onSave={saveEditedPhoto}
      />

      <PhotoEditorModal
        open={Boolean(messageImageViewer)}
        images={messageImageViewer?.images ?? []}
        index={messageImageViewer?.index ?? 0}
        onClose={() => setMessageImageViewer(null)}
        onIndexChange={(nextIndex) =>
          setMessageImageViewer((prev) => (prev ? { ...prev, index: nextIndex } : prev))
        }
      />

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
