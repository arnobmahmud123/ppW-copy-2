"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import PhotoEditorModal from "@/components/PhotoEditorModal"
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
  Copy,
  ChevronDown,
  Image,
  Clipboard,
  ChevronLeft,
  ChevronRight,
  Settings,
  Send,
  Printer,
  X
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
  historyCount?: number
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
  iplNo?: string
  workOrderNumber: string
  status?: string
  workType?: string
  photoCount?: number
  contractor?: string
  dueDate?: string | null
  address?: string
  invoiceNumber?: string | null
  invoiceStatus?: string | null
  invoiceTotal?: number
  invoiceDate?: string | null
  workOrderId?: string
  taskId?: string
  photoTypes?: string[]
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

interface WorkOrderPhotoFile {
  id: string
  url: string
  category: string
  requirementId?: string | null
  taskId?: string
  mimeType?: string
}

interface WorkOrderDetailsResponse extends WorkOrder {
  files: WorkOrderPhotoFile[]
  tasks?: string | null
  description?: string | null
  client: {
    name: string
    company?: string
    email?: string
    phone?: string
  }
  assignedContractor?: {
    name: string
    company?: string
    email?: string
    phone?: string
  }
  creator?: {
    name?: string
    email?: string
  }
}

interface ExportTask {
  taskType?: string
  taskName?: string
  customTaskName?: string
  qty?: number
  uom?: string
  contractorPrice?: number
  clientPrice?: number
  comments?: string
  id?: string
  photoRequirements?: {
    id?: string
    type?: string
    label?: string
    uploads?: { id?: string; url?: string }[]
  }[]
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

interface ParsedTaskRequirement {
  id?: string
  type?: string
  label?: string
  required?: boolean
}

interface ParsedTask {
  id?: string
  taskType?: string
  taskName?: string
  customTaskName?: string
  comments?: string
  photoRequirements?: ParsedTaskRequirement[]
}

interface ComplianceIssue {
  key: string
  label: string
}

type WorkOrderColumnKey =
  | "action"
  | "ipl"
  | "workOrderNumber"
  | "address"
  | "zip"
  | "photos"
  | "history"
  | "status"
  | "state"
  | "city"
  | "fieldComplete"
  | "client"
  | "contractor"
  | "dueDate"

const defaultColumnOrder: WorkOrderColumnKey[] = [
  "action",
  "ipl",
  "workOrderNumber",
  "address",
  "zip",
  "photos",
  "history",
  "status",
  "state",
  "city",
  "fieldComplete",
  "client",
  "contractor",
  "dueDate",
]

const allColumns: WorkOrderColumnKey[] = [
  "action",
  "ipl",
  "workOrderNumber",
  "address",
  "zip",
  "photos",
  "history",
  "status",
  "state",
  "city",
  "fieldComplete",
  "client",
  "contractor",
  "dueDate",
]

const bulkStatusOptions = [
  "NEW",
  "UNASSIGNED",
  "IN_PROGRESS",
  "ASSIGNED",
  "READ",
  "COMPLETED",
  "FIELD_COMPLETE",
  "OFFICE_APPROVED",
  "SENT_TO_CLIENT",
  "CLOSED",
  "CANCELLED",
]

export default function AdminWorkOrders() {
  const { data: session } = useSession()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const defaultStatusFilters: StatusFilters = {
    unassigned: true,
    assigned: true,
    read: true,
    fieldComplete: true,
    officeApproved: true,
    sentToClient: false,
    closed: false,
    cancelled: false
  }
  const [searchTerm, setSearchTerm] = useState("")
  const [draftColumnFilters, setDraftColumnFilters] = useState<ColumnFilter>({})
  const [appliedColumnFilters, setAppliedColumnFilters] = useState<ColumnFilter>({})
  const [draftStatusFilters, setDraftStatusFilters] = useState<StatusFilters>(defaultStatusFilters)
  const [appliedStatusFilters, setAppliedStatusFilters] = useState<StatusFilters>(defaultStatusFilters)
  const [showImportModal, setShowImportModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(200)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [showColumnsModal, setShowColumnsModal] = useState(false)
  const [historyModalOrder, setHistoryModalOrder] = useState<WorkOrder | null>(null)
  const [historyModalLoading, setHistoryModalLoading] = useState(false)
  const [activeHistoryTab, setActiveHistoryTab] = useState<PropertyHistoryTab>("past")
  const [historyCommentSearch, setHistoryCommentSearch] = useState("")
  const [historyColumnFilters, setHistoryColumnFilters] = useState<Record<string, string>>({})
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
  const [photoModalOrder, setPhotoModalOrder] = useState<WorkOrder | null>(null)
  const [photoModalLoading, setPhotoModalLoading] = useState(false)
  const [photoModalFiles, setPhotoModalFiles] = useState<WorkOrderPhotoFile[]>([])
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])
  const [photoLightbox, setPhotoLightbox] = useState<{ open: boolean; images: { id: string; url: string }[]; index: number }>({
    open: false,
    images: [],
    index: 0,
  })
  const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<string[]>([])
  const [columnOrder, setColumnOrder] = useState<WorkOrderColumnKey[]>(defaultColumnOrder)
  const [draftColumnOrder, setDraftColumnOrder] = useState<WorkOrderColumnKey[]>(defaultColumnOrder)
  const [draggedColumn, setDraggedColumn] = useState<WorkOrderColumnKey | null>(null)
  const [draggedDraftColumn, setDraggedDraftColumn] = useState<WorkOrderColumnKey | null>(null)
  const [bulkContractorId, setBulkContractorId] = useState("")
  const [bulkCoordinatorId, setBulkCoordinatorId] = useState("")
  const [bulkProcessorId, setBulkProcessorId] = useState("")
  const [bulkStatus, setBulkStatus] = useState("")
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [complianceByWorkOrderId, setComplianceByWorkOrderId] = useState<Record<string, ComplianceIssue[]>>({})
  const [complianceLoading, setComplianceLoading] = useState(false)

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

  const toggleWorkOrderSelection = (workOrderId: string, checked: boolean) => {
    setSelectedWorkOrderIds((current) =>
      checked ? [...new Set([...current, workOrderId])] : current.filter((id) => id !== workOrderId)
    )
  }

  const toggleVisibleWorkOrdersSelection = (checked: boolean, visibleOrders: WorkOrder[]) => {
    const visibleIds = visibleOrders.map((order) => order.id)
    setSelectedWorkOrderIds((current) =>
      checked ? [...new Set([...current, ...visibleIds])] : current.filter((id) => !visibleIds.includes(id))
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEW":
      case "UNASSIGNED":
        return "bg-[#313a58] text-[#d9e2ff]"
      case "IN_PROGRESS":
      case "ASSIGNED":
        return "bg-[#dfe9ff] text-[#3657a7] ring-1 ring-[#b8ccff]"
      case "READ":
        return "bg-[#3d3b73] text-[#ddd9ff]"
      case "COMPLETED":
      case "FIELD_COMPLETE":
        return "bg-[#5a4730] text-[#ffd08a]"
      case "OFFICE_APPROVED":
        return "bg-[#f5e8ff] text-[#9b2fd1] ring-1 ring-[#e5c1ff]"
      case "SENT_TO_CLIENT":
        return "bg-[#5b3a29] text-[#ffb487]"
      case "CLOSED":
        return "bg-[#22453a] text-[#8ce8b1]"
      case "CANCELLED":
        return "bg-[#5a2f35] text-[#ffb1bc]"
      default:
        return "bg-[#313a58] text-[#d9e2ff]"
    }
  }

  const getDueDateMeta = (dueDate?: string | null) => {
    if (!dueDate || !String(dueDate).trim()) {
      return {
        label: "No due date",
        className: "bg-[#eef2ff] text-[#5b6994] ring-1 ring-[#d8e0ff]",
      }
    }

    const date = new Date(dueDate)
    if (Number.isNaN(date.getTime())) {
      return {
        label: "Invalid date",
        className: "bg-[#fff0e8] text-[#b56a34] ring-1 ring-[#ffd5be]",
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(date)
    target.setHours(0, 0, 0, 0)
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)
    const formatted = target.toLocaleDateString()

    if (diffDays < 0) {
      return {
        label: `${formatted} • Overdue`,
        className: "bg-[#fff0f4] text-[#c14b68] ring-1 ring-[#ffc2cf]",
      }
    }

    if (diffDays === 0) {
      return {
        label: `${formatted} • Today`,
        className: "bg-[#fff1e8] text-[#c46b2b] ring-1 ring-[#ffd1b5]",
      }
    }

    if (diffDays <= 2) {
      return {
        label: `${formatted} • Urgent`,
        className: "bg-[#fff7e8] text-[#a97816] ring-1 ring-[#ffe0a3]",
      }
    }

    if (diffDays <= 7) {
      return {
        label: `${formatted} • Soon`,
        className: "bg-[#e7efff] text-[#3f63bc] ring-1 ring-[#c2d4ff]",
      }
    }

    return {
      label: formatted,
      className: "bg-[#eaf9f0] text-[#1f8f63] ring-1 ring-[#bde8cf]",
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "NEW":
      case "UNASSIGNED":
        return AlertCircle
      case "IN_PROGRESS":
      case "ASSIGNED":
        return User
      case "READ":
        return Eye
      case "COMPLETED":
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
      case "NEW":
        return "Unassigned"
      case "UNASSIGNED":
        return "Unassigned"
      case "IN_PROGRESS":
        return "Assigned"
      case "ASSIGNED":
        return "Assigned"
      case "READ":
        return "Read"
      case "COMPLETED":
        return "Field Complete"
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

  const parseTasks = (tasksRaw?: string | null): ParsedTask[] => {
    if (!tasksRaw || !tasksRaw.trim()) return []
    try {
      const parsed = JSON.parse(tasksRaw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const normalizePhotoType = (value?: string) => {
    const normalized = String(value || "").toUpperCase()
    return normalized.startsWith("PHOTO_") ? normalized.replace("PHOTO_", "") : normalized
  }

  const getComplianceIssues = (order: WorkOrderDetailsResponse): ComplianceIssue[] => {
    const issues: ComplianceIssue[] = []
    const tasks = parseTasks(order.tasks)
    const files = Array.isArray(order.files) ? order.files : []
    const serviceRules: Record<string, string[]> = {
      WINTERIZATION: ["BEFORE", "DURING", "AFTER", "BID"],
      INSPECTION: ["INSPECTION"],
      BOARD_UP: ["BEFORE", "DURING", "AFTER"],
      OTHER: ["BEFORE", "AFTER"],
    }

    if (!order.title?.trim() || !order.description?.trim() || !order.addressLine1?.trim()) {
      issues.push({ key: "required-fields", label: "Required field validation failed" })
    }

    if (!order.lockCode?.trim()) {
      issues.push({ key: "lock-change", label: "Lock change compliance missing lock code" })
    }
    if (!order.lockLocation?.trim()) {
      issues.push({ key: "lockbox", label: "Lockbox code verification missing lockbox location" })
    }
    if (!order.keyCode?.trim()) {
      issues.push({ key: "key-code", label: "Key code photo verification missing key code" })
    }

    const requiredTypes = new Set<string>(["BEFORE", "DURING", "AFTER"])
    const taskRequirementTypes = tasks.flatMap((task) =>
      Array.isArray(task.photoRequirements)
        ? task.photoRequirements.filter((req) => req?.required !== false).map((req) => normalizePhotoType(req.type || req.label))
        : []
    )
    const ruleTypes = serviceRules[order.serviceType] || []
    for (const reqType of [...taskRequirementTypes, ...ruleTypes]) {
      if (reqType) requiredTypes.add(reqType)
    }

    const uploadedTypes = new Set(files.map((file) => normalizePhotoType(file.category)))
    for (const requiredType of requiredTypes) {
      if (!uploadedTypes.has(requiredType)) {
        issues.push({
          key: `photo-${requiredType.toLowerCase()}`,
          label: `Missing ${requiredType} photo requirement`,
        })
      }
    }

    if (tasks.some((task) => !String(task.taskName || task.customTaskName || task.comments || "").trim())) {
      issues.push({ key: "pending-issues", label: "Pending issue detection found empty task description" })
    }

    return issues
  }

  const fetchWorkOrderDetails = async (workOrderId: string): Promise<WorkOrderDetailsResponse | null> => {
    const response = await fetch(`/api/work-orders/${workOrderId}`)
    if (!response.ok) return null
    return response.json()
  }

  const runBulkUpdate = async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/work-orders/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workOrderIds: selectedWorkOrderIds,
        ...payload,
      }),
    })

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}))
      throw new Error(errorPayload?.error || "Bulk update failed")
    }
  }

  const updateColumnFilter = (column: string, value: string) => {
    setDraftColumnFilters(prev => ({
      ...prev,
      [column]: value
    }))
    setAppliedColumnFilters(prev => ({
      ...prev,
      [column]: value
    }))
    setCurrentPage(1)
  }

  const updateStatusFilter = (status: keyof StatusFilters, checked: boolean) => {
    setDraftStatusFilters(prev => ({
      ...prev,
      [status]: checked
    }))
    setAppliedStatusFilters(prev => ({
      ...prev,
      [status]: checked
    }))
    setCurrentPage(1)
  }

  const runFilter = () => {
    setAppliedColumnFilters({ ...draftColumnFilters })
    setAppliedStatusFilters({ ...draftStatusFilters })
    setCurrentPage(1)
  }

  const resetFilter = () => {
    setDraftColumnFilters({})
    setAppliedColumnFilters({})
    setDraftStatusFilters(defaultStatusFilters)
    setAppliedStatusFilters(defaultStatusFilters)
    setCurrentPage(1)
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

  const escapeHtml = (value: string | number | undefined | null) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")

  const formatTaskName = (task: ExportTask) => {
    if (task.taskName === "Other") {
      return task.customTaskName || "Custom Item"
    }
    if (task.taskName && task.taskName.trim()) {
      return task.taskName
    }
    if (task.comments && task.comments.trim()) {
      const compact = task.comments.replace(/\s+/g, " ").trim()
      return compact.length > 72 ? `${compact.slice(0, 72)}...` : compact
    }
    return task.taskType === "Bid" ? "Unnamed Bid Item" : task.taskType === "Inspection" ? "Unnamed Inspection Item" : "Unnamed Task"
  }

  const currency = (value?: number | null) => `$${Number(value || 0).toFixed(2)}`
  const getRequirementUploadsForExport = (
    files: WorkOrderPhotoFile[],
    task: ExportTask,
    requirementType: string
  ) => {
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

    const fileMatches = Array.isArray(files)
      ? files.filter((file) => {
          if (file.requirementId && requirementIds.length) {
            return requirementIds.includes(file.requirementId)
          }
          if (file.taskId && task.id && file.taskId === task.id && file.category) {
            return normalizeRequirementType(file.category) === normalizedTarget
          }
          return false
        })
      : []

    return [
      ...embeddedUploads.map((upload) => ({ id: upload.id || "", url: upload.url || "" })),
      ...fileMatches.map((file) => ({ id: file.id, url: file.url })),
    ].filter(
      (item, index, arr) =>
        !!item.url && arr.findIndex((candidate) => candidate.id === item.id || candidate.url === item.url) === index
    )
  }

  const buildExportTaskCardsHtml = (
    files: WorkOrderPhotoFile[],
    taskList: ExportTask[],
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
              <p class="eyebrow">${escapeHtml(options.eyebrow)}</p>
              <h2>${escapeHtml(options.title)}</h2>
            </div>
          </div>
          <div class="empty-card">${escapeHtml(options.emptyMessage)}</div>
        </section>
      `
    }

    return `
      <section class="section">
        <div class="section-head">
          <div>
            <p class="eyebrow">${escapeHtml(options.eyebrow)}</p>
            <h2>${escapeHtml(options.title)}</h2>
          </div>
          <div class="badge ${options.badgeClass}">${taskList.length} item${taskList.length === 1 ? "" : "s"}</div>
        </div>
        <div class="task-stack">
          ${taskList
            .map((task) => {
              const taskDisplayName = formatTaskName(task)
              const qty = Number(task.qty || 0)
              const contractorPrice = Number(task.contractorPrice || 0)
              const clientPrice = Number(task.clientPrice || 0)
              const photoGroups = options.photoTypes
                .map(({ type, label }) => {
                  const uploads = getRequirementUploadsForExport(files, task, type)
                  if (!uploads.length) return ""

                  return `
                    <div class="photo-subgroup">
                      <div class="photo-item-name">${escapeHtml(taskDisplayName)}</div>
                      <div class="photo-subgroup-title">
                        <small>${escapeHtml(label)}</small>
                      </div>
                      <div class="photo-grid">
                        ${uploads
                          .map(
                            (upload, index) => `
                              <figure class="photo-card">
                                <div class="photo-shell">
                                  <img src="${escapeHtml(upload.url)}" alt="${escapeHtml(taskDisplayName)} ${index + 1}" />
                                </div>
                                <figcaption>
                                  <span class="photo-tag">${escapeHtml(taskDisplayName)}</span>
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
                      <h3>${escapeHtml(taskDisplayName)}</h3>
                      <p>${escapeHtml(task.taskType || "Task")}</p>
                    </div>
                    <div class="task-pill">${escapeHtml(qty || "")} ${escapeHtml(task.uom || "EACH")}</div>
                  </div>
                  <div class="task-meta">
                    <div><strong>Contractor</strong><span>${currency(contractorPrice)} each</span></div>
                    <div><strong>Client</strong><span>${currency(clientPrice)} each</span></div>
                    <div><strong>Contractor Total</strong><span>${currency(contractorPrice * qty)}</span></div>
                    <div><strong>Client Total</strong><span>${currency(clientPrice * qty)}</span></div>
                  </div>
                  <div class="task-comments">
                    <strong>Comments</strong>
                    <span>${escapeHtml(task.comments || "No comments provided.")}</span>
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

  const handleExportWorkOrder = async (order: WorkOrder) => {
    try {
      const [workOrderResponse, tasksResponse] = await Promise.all([
        fetch(`/api/work-orders/${order.id}`),
        fetch(`/api/work-orders/${order.id}/tasks`),
      ])

      if (!workOrderResponse.ok || !tasksResponse.ok) {
        throw new Error("Unable to load work order export data")
      }

      const workOrderData: WorkOrderDetailsResponse = await workOrderResponse.json()
      const tasksPayload = await tasksResponse.json()
      const tasks: ExportTask[] = Array.isArray(tasksPayload?.tasks) ? tasksPayload.tasks : []
      const files = (workOrderData.files || []).filter((file) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.url))
      const inspectionTasks = tasks.filter((task) => task.taskType === "Inspection")
      const bidTasks = tasks.filter((task) => task.taskType === "Bid")
      const completionTasks = tasks.filter((task) => task.taskType !== "Bid" && task.taskType !== "Inspection")

      const printTitle = `${workOrderData.workOrderNumber || workOrderData.id} Work Order`
      const description = workOrderData.description?.trim() || order.title || "Work order export"
      const dueDateLabel = workOrderData.dueDate ? new Date(workOrderData.dueDate).toLocaleDateString() : "Not set"
      const createdLabel = workOrderData.createdAt ? new Date(workOrderData.createdAt).toLocaleDateString() : "Not set"

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${escapeHtml(printTitle)}</title>
            <style>
              * { box-sizing: border-box; }
              body {
                margin: 0;
                background: #f3f6fb;
                color: #14213d;
                font-family: "Helvetica Neue", Arial, sans-serif;
              }
              .page {
                max-width: 1120px;
                margin: 0 auto;
                padding: 28px;
              }
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
              h1 {
                margin: 0;
                font-size: 34px;
                line-height: 1.05;
              }
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
              h2 {
                margin: 0;
                font-size: 24px;
                color: #14213d;
              }
              .badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 999px;
                padding: 8px 12px;
                font-size: 12px;
                font-weight: 700;
              }
              .badge.orange { background: #ffe3d6; color: #b44f1f; }
              .badge.blue { background: #dce8ff; color: #2750a5; }
              .overview-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
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
              .data-table {
                width: 100%;
                border-collapse: collapse;
                overflow: hidden;
                border-radius: 18px;
              }
              .data-table th {
                background: #edf2fb;
                color: #30405f;
                text-align: left;
                font-size: 12px;
                letter-spacing: .04em;
                text-transform: uppercase;
                padding: 12px;
                border-bottom: 1px solid #d8e2f1;
              }
              .data-table td {
                padding: 14px 12px;
                border-bottom: 1px solid #e7edf7;
                font-size: 13px;
                vertical-align: top;
                color: #1d2942;
              }
              .task-name {
                font-weight: 700;
                margin-bottom: 4px;
              }
              .task-note {
                color: #64748b;
                line-height: 1.5;
              }
              .photo-group + .photo-group {
                margin-top: 24px;
              }
              .photo-group-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
              }
              .photo-group-head h3 {
                margin: 0;
                font-size: 18px;
                color: #18263f;
              }
              .photo-group-head span {
                color: #5a6b88;
                font-size: 13px;
                font-weight: 700;
              }
              .photo-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 14px;
              }
              .task-stack {
                display: flex;
                flex-direction: column;
                gap: 16px;
              }
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
              .task-card-head h3 {
                margin: 0;
                font-size: 20px;
                color: #18263f;
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
              .photo-card {
                margin: 0;
                border: 1px solid #dbe4f1;
                border-radius: 18px;
                padding: 12px;
                background: #f9fbff;
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
              .photo-tag {
                font-weight: 700;
                color: #21395f;
              }
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
                .section, .hero { break-inside: avoid; box-shadow: none; }
              }
            </style>
          </head>
          <body>
            <div class="page">
              <section class="hero">
                <p class="eyebrow">Work Order Export</p>
                <h1>${escapeHtml(workOrderData.workOrderNumber || workOrderData.id)}</h1>
                <div class="hero-sub">${escapeHtml(description)}</div>
                <div class="summary-grid">
                  <div class="summary-card">
                    <div class="summary-label">Address</div>
                    <div class="summary-value">${escapeHtml(`${workOrderData.addressLine1}, ${workOrderData.city}, ${workOrderData.state} ${workOrderData.postalCode}`)}</div>
                  </div>
                  <div class="summary-card">
                    <div class="summary-label">Client</div>
                    <div class="summary-value">${escapeHtml(workOrderData.client?.name || "Unassigned")}</div>
                  </div>
                  <div class="summary-card">
                    <div class="summary-label">Contractor</div>
                    <div class="summary-value">${escapeHtml(workOrderData.assignedContractor?.name || "Unassigned")}</div>
                  </div>
                  <div class="summary-card">
                    <div class="summary-label">Status</div>
                    <div class="summary-value">${escapeHtml(getStatusDisplayName(workOrderData.status))}</div>
                  </div>
                </div>
              </section>

              <section class="section">
                <div class="section-head">
                  <div>
                    <p class="eyebrow">Overview</p>
                    <h2>Work Order Summary</h2>
                  </div>
                  <div class="badge blue">${escapeHtml(workOrderData.serviceType || "Service")}</div>
                </div>
                <div class="overview-grid">
                  <div class="overview-card">
                    <strong>Due Date</strong>
                    <span>${escapeHtml(dueDateLabel)}</span>
                  </div>
                  <div class="overview-card">
                    <strong>Created</strong>
                    <span>${escapeHtml(createdLabel)}</span>
                  </div>
                  <div class="overview-card">
                    <strong>Photos</strong>
                    <span>${escapeHtml(String(workOrderData.files?.length || 0))}</span>
                  </div>
                </div>
              </section>

              ${buildExportTaskCardsHtml(files, inspectionTasks, {
                title: "Inspection Items",
                eyebrow: "Inspection",
                badgeClass: "blue",
                photoTypes: [{ type: "INSPECTION", label: "Inspection Photos" }],
                emptyMessage: "No inspection items were found for this work order.",
              })}
              ${buildExportTaskCardsHtml(files, bidTasks, {
                title: "Bid Items",
                eyebrow: "Bid",
                badgeClass: "orange",
                photoTypes: [{ type: "BID", label: "Bid Photos" }],
                emptyMessage: "No bid items were found for this work order.",
              })}
              ${buildExportTaskCardsHtml(files, completionTasks, {
                title: "Task / Completion Items",
                eyebrow: "Completion",
                badgeClass: "blue",
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
        throw new Error("Unable to open print frame")
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
    } catch (error) {
      console.error("Failed to export work order:", error)
      alert("Unable to export this work order right now.")
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
    activeHistoryTab === "contractorInvoice" || activeHistoryTab === "clientInvoice"
  const showingBidHistory = activeHistoryTab === "bid"
  const showingCompletionHistory = activeHistoryTab === "completion"
  const activeHistoryRows = (propertyHistory[activeHistoryTab] || []).filter((row) => {
    if (showingBidHistory || showingCompletionHistory) {
      const needle = historyCommentSearch.trim().toLowerCase()
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
        case "address":
          return row.address || ""
        default:
          return ""
      }
    }

    return Object.entries(historyColumnFilters).every(([field, value]) => {
      const needle = value.trim().toLowerCase()
      if (!needle) return true
      return getFieldValue(field).toLowerCase().includes(needle)
    })
  })

  const formatHistoryWorkType = (value?: string | null) =>
    value ? value.replaceAll("_", " ") : "-"

  const historyFilterInputClassName =
    "min-w-[96px] w-full rounded-xl border border-white/10 bg-[#1f2941] px-3 py-2 text-xs text-[#edf2ff] outline-none placeholder:text-[#7f8bb1] focus:border-[#ff7a49]/60"

  const setHistoryColumnFilter = (field: string, value: string) => {
    setHistoryColumnFilters((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const openHistoryModal = async (order: WorkOrder) => {
    setHistoryModalOrder(order)
    setActiveHistoryTab("past")
    setHistoryCommentSearch("")
    setHistoryColumnFilters({})
    setHistoryModalLoading(true)
    try {
      const response = await fetch(`/api/work-orders/${order.id}/history`)
      if (response.ok) {
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
      }
    } catch (error) {
      console.error("Error fetching property history:", error)
    } finally {
      setHistoryModalLoading(false)
    }
  }

  const openPhotoModal = async (order: WorkOrder) => {
    setPhotoModalOrder(order)
    setPhotoModalLoading(true)
    setPhotoModalFiles([])
    setSelectedPhotoIds([])
    try {
      const response = await fetch(`/api/work-orders/${order.id}`)
      if (response.ok) {
        const data: WorkOrderDetailsResponse = await response.json()
        setPhotoModalFiles(data.files || [])
      }
    } catch (error) {
      console.error("Error fetching work order photos:", error)
    } finally {
      setPhotoModalLoading(false)
    }
  }

  const openPhotoModalById = async (workOrderId: string) => {
    setPhotoModalOrder(null)
    setPhotoModalLoading(true)
    setPhotoModalFiles([])
    setSelectedPhotoIds([])
    try {
      const response = await fetch(`/api/work-orders/${workOrderId}`)
      if (response.ok) {
        const data: WorkOrderDetailsResponse = await response.json()
        setPhotoModalOrder(data)
        setPhotoModalFiles(data.files || [])
      }
    } catch (error) {
      console.error("Error fetching work order photos:", error)
    } finally {
      setPhotoModalLoading(false)
    }
  }

  const openPhotoModalByHistoryRow = async (row: PropertyHistoryRow) => {
    const workOrderId = row.workOrderId || row.id
    setPhotoModalOrder(null)
    setPhotoModalLoading(true)
    setPhotoModalFiles([])
    setSelectedPhotoIds([])

    const normalizePhotoType = (value?: string) => {
      const normalized = String(value || "").toUpperCase()
      return normalized.startsWith("PHOTO_") ? normalized.replace("PHOTO_", "") : normalized
    }

    try {
      const response = await fetch(`/api/work-orders/${workOrderId}`)
      if (response.ok) {
        const data: WorkOrderDetailsResponse = await response.json()
        const targetPhotoTypes = Array.isArray(row.photoTypes) ? row.photoTypes.map(normalizePhotoType) : []
        let filteredFiles = data.files || []

        if (row.taskId && targetPhotoTypes.length > 0) {
          let requirementIds: string[] = []

          try {
            const parsedTasks = data.tasks ? JSON.parse(String(data.tasks)) : []
            const matchingTask = Array.isArray(parsedTasks)
              ? parsedTasks.find((task: { id?: string }) => String(task?.id || "") === String(row.taskId))
              : null

            requirementIds = Array.isArray(matchingTask?.photoRequirements)
              ? matchingTask.photoRequirements
                  .filter((requirement: { id?: string; type?: string; label?: string }) => {
                    const typeMatch = targetPhotoTypes.includes(normalizePhotoType(requirement?.type))
                    const labelMatch = targetPhotoTypes.includes(normalizePhotoType(requirement?.label))
                    const idMatch = targetPhotoTypes.some((type) => String(requirement?.id || "").toUpperCase().includes(type))
                    return typeMatch || labelMatch || idMatch
                  })
                  .map((requirement: { id?: string }) => String(requirement.id || ""))
                  .filter(Boolean)
              : []
          } catch (error) {
            console.error("Error parsing tasks for history photo filtering:", error)
          }

          filteredFiles = filteredFiles.filter((file) => {
            if (file.requirementId && requirementIds.length > 0) {
              return requirementIds.includes(String(file.requirementId))
            }
            if (file.taskId && String(file.taskId) === String(row.taskId) && file.category) {
              return targetPhotoTypes.includes(normalizePhotoType(file.category))
            }
            return false
          })
        }

        setPhotoModalOrder(data)
        setPhotoModalFiles(filteredFiles)
      }
    } catch (error) {
      console.error("Error fetching history row photos:", error)
    } finally {
      setPhotoModalLoading(false)
    }
  }

  const togglePhotoSelection = (fileId: string) => {
    setSelectedPhotoIds((current) =>
      current.includes(fileId)
        ? current.filter((id) => id !== fileId)
        : [...current, fileId]
    )
  }

  const toggleSelectAllPhotos = () => {
    setSelectedPhotoIds((current) =>
      current.length === photoModalFiles.length ? [] : photoModalFiles.map((file) => file.id)
    )
  }

  const triggerPhotoDownload = (file: WorkOrderPhotoFile) => {
    const link = document.createElement("a")
    link.href = file.url
    link.download = `${file.category.toLowerCase()}-${file.id}.${file.url.split(".").pop() || "jpg"}`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const downloadSelectedPhotos = () => {
    if (!photoModalOrder || selectedPhotoIds.length === 0) return
    const params = new URLSearchParams({ scope: "selected" })
    selectedPhotoIds.forEach((id) => params.append("fileId", id))
    window.open(`/api/work-orders/${photoModalOrder.id}/photos/download?${params.toString()}`, "_blank")
  }

  const downloadAllPhotos = () => {
    if (!photoModalOrder) return
    window.open(`/api/work-orders/${photoModalOrder.id}/photos/download?scope=all`, "_blank")
  }

  const filteredWorkOrders = (workOrders || []).filter(order => {
    // Status filtering
    const statusDisplayName = getStatusDisplayName(order.status).toLowerCase()
    const statusMatches = 
      (statusDisplayName === "unassigned" && appliedStatusFilters.unassigned) ||
      (statusDisplayName === "assigned" && appliedStatusFilters.assigned) ||
      (statusDisplayName === "read" && appliedStatusFilters.read) ||
      (statusDisplayName === "field complete" && appliedStatusFilters.fieldComplete) ||
      (statusDisplayName === "office approved" && appliedStatusFilters.officeApproved) ||
      (statusDisplayName === "sent to client" && appliedStatusFilters.sentToClient) ||
      (statusDisplayName === "closed" && appliedStatusFilters.closed) ||
      (statusDisplayName === "cancelled" && appliedStatusFilters.cancelled)

    // Column filtering
    const columnMatches = Object.entries(appliedColumnFilters).every(([column, filterValue]) => {
      const needle = filterValue.trim().toLowerCase()
      if (!needle) return true

      return getOrderColumnFilterValue(order, column).toLowerCase().includes(needle)
    })

    const searchNeedle = searchTerm.trim().toLowerCase()
    let completionTaskMatch = true
    if (searchNeedle) {
      const tasks = parseTasks((order as WorkOrderDetailsResponse).tasks)
      completionTaskMatch = tasks.some((task) => {
        const taskType = String(task.taskType || "").toLowerCase()
        if (taskType === "bid" || taskType === "inspection") return false
        const blob = `${task.taskName || ""} ${task.customTaskName || ""} ${task.comments || ""}`.toLowerCase()
        return blob.includes(searchNeedle)
      })
      const fallbackBlob = `${order.title} ${order.workOrderNumber || ""} ${order.addressLine1} ${order.city} ${order.state}`.toLowerCase()
      completionTaskMatch = completionTaskMatch || fallbackBlob.includes(searchNeedle)
    }

    return statusMatches && columnMatches && completionTaskMatch
  })

  const getPropertyHistoryCount = (order: WorkOrder) => {
    if (typeof order.historyCount === "number") {
      return order.historyCount
    }

    return Math.max(
      (workOrders || []).filter((candidate) =>
        candidate.id !== order.id &&
        candidate.addressLine1 === order.addressLine1 &&
        candidate.city === order.city &&
        candidate.state === order.state
      ).length,
      0
    )
  }

  function getOrderColumnFilterValue(order: WorkOrder, column: string) {
    switch (column) {
      case "ipl":
        return order.id.slice(-7)
      case "workOrderNumber":
        return `${order.workOrderNumber || ""} ${order.id} ${order.title || ""}`.trim()
      case "address":
        return `${order.addressLine1} ${order.city} ${order.state} ${order.postalCode || ""}`.trim()
      case "zip":
        return order.postalCode || ""
      case "photos":
        return String(order._count?.files ?? 0)
      case "history":
        return String(getPropertyHistoryCount(order))
      case "status":
        return `${getStatusDisplayName(order.status)} ${order.status}`.trim()
      case "state":
        return order.state || ""
      case "city":
        return order.city || ""
      case "client":
        return `${order.client?.name || ""} ${order.client?.company || ""}`.trim()
      case "contractor":
        return order.assignedContractor
          ? `${order.assignedContractor.name || ""} ${order.assignedContractor.company || ""}`.trim()
          : "Unassigned"
      case "dueDate": {
        const dueDateMeta = getDueDateMeta(order.dueDate)
        return `${dueDateMeta.label} ${order.dueDate || ""}`.trim()
      }
      case "fieldComplete":
        return order.fieldComplete
          ? new Date(order.fieldComplete).toLocaleDateString()
          : "Not complete"
      default:
        return ""
    }
  }

  const handleColumnDragStart = (column: WorkOrderColumnKey) => {
    setDraggedColumn(column)
  }

  const handleColumnDrop = (targetColumn: WorkOrderColumnKey) => {
    if (!draggedColumn || draggedColumn === targetColumn) return

    setColumnOrder((prev) => {
      const next = [...prev]
      const fromIndex = next.indexOf(draggedColumn)
      const toIndex = next.indexOf(targetColumn)

      if (fromIndex === -1 || toIndex === -1) return prev

      next.splice(fromIndex, 1)
      next.splice(toIndex, 0, draggedColumn)
      return next
    })
    setDraggedColumn(null)
  }

  const openColumnsModal = () => {
    setDraftColumnOrder(columnOrder)
    setDraggedDraftColumn(null)
    setShowColumnsModal(true)
  }

  const activeColumns = draftColumnOrder
  const inactiveColumns = allColumns.filter((column) => !draftColumnOrder.includes(column))

  const moveDraftColumn = (column: WorkOrderColumnKey, targetList: "active" | "inactive", targetColumn?: WorkOrderColumnKey) => {
    const withoutColumn = draftColumnOrder.filter((item) => item !== column)

    if (targetList === "inactive") {
      setDraftColumnOrder(withoutColumn)
      return
    }

    if (!targetColumn || !withoutColumn.includes(targetColumn)) {
      setDraftColumnOrder([...withoutColumn, column])
      return
    }

    const targetIndex = withoutColumn.indexOf(targetColumn)
    const next = [...withoutColumn]
    next.splice(targetIndex, 0, column)
    setDraftColumnOrder(next)
  }

  const handleDraftColumnDrop = (targetList: "active" | "inactive", targetColumn?: WorkOrderColumnKey) => {
    if (!draggedDraftColumn) return
    moveDraftColumn(draggedDraftColumn, targetList, targetColumn)
    setDraggedDraftColumn(null)
  }

  const applyColumnChanges = () => {
    setColumnOrder(draftColumnOrder)
    setShowColumnsModal(false)
  }

  const getColumnHeaderLabel = (column: WorkOrderColumnKey) => {
    switch (column) {
      case "action":
        return "Action"
      case "ipl":
        return "IPL #"
      case "workOrderNumber":
        return "Work Order #"
      case "address":
        return "Address"
      case "zip":
        return "ZIP"
      case "photos":
        return "Photos"
      case "history":
        return "History"
      case "status":
        return "Status"
      case "state":
        return "State"
      case "city":
        return "City"
      case "fieldComplete":
        return "Field Comp..."
      case "client":
        return "Client"
      case "contractor":
        return "Contractor"
      case "dueDate":
        return "Due Date"
      default:
        return column
    }
  }

  const renderColumnFilter = (column: WorkOrderColumnKey) => {
    if (column === "action") {
      const allVisibleSelected =
        paginatedWorkOrders.length > 0 && paginatedWorkOrders.every((order) => selectedWorkOrderIds.includes(order.id))

      return (
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            className="rounded"
            checked={allVisibleSelected}
            onChange={(e) => toggleVisibleWorkOrdersSelection(e.target.checked, paginatedWorkOrders)}
          />
          <span title="View Work Order Details">
            <Eye className="h-4 w-4 text-[#7f8ab0]" />
          </span>
          <span title="Copy Work Order Info">
            <Clipboard className="h-4 w-4 text-[#7f8ab0]" />
          </span>
        </div>
      )
    }

    const filterConfig: Partial<Record<WorkOrderColumnKey, { key: string; placeholder?: string; calendar?: boolean }>> = {
      ipl: { key: "ipl", placeholder: "8337511" },
      workOrderNumber: { key: "workOrderNumber", placeholder: "Work order #" },
      address: { key: "address", placeholder: "Address" },
      zip: { key: "zip", placeholder: "ZIP" },
      photos: { key: "photos", placeholder: "Photo count" },
      history: { key: "history", placeholder: "History count" },
      status: { key: "status", placeholder: "Status" },
      state: { key: "state", placeholder: "State" },
      city: { key: "city", placeholder: "City" },
      fieldComplete: { key: "fieldComplete", placeholder: "Field complete date", calendar: true },
      client: { key: "client", placeholder: "Client" },
      contractor: { key: "contractor", placeholder: "Contractor" },
      dueDate: { key: "dueDate", placeholder: "Due date", calendar: true },
    }

    const config = filterConfig[column]
    if (!config) {
      return null
    }

    return (
      <div className="flex items-center">
        <Filter className="mr-1 h-4 w-4 text-[#7f8ab0]" />
        {config.calendar && <Calendar className="ml-1 mr-1 h-4 w-4 text-[#7f8ab0]" />}
        <input
          type="text"
          value={draftColumnFilters[config.key] || ""}
          onChange={(e) => updateColumnFilter(config.key, e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#2c3653] px-2 py-1 text-xs text-[#edf2ff]"
          placeholder={config.placeholder}
        />
      </div>
    )
  }

  const renderColumnCell = (column: WorkOrderColumnKey, order: WorkOrder) => {
    const statusDisplayName = getStatusDisplayName(order.status)

    switch (column) {
      case "action":
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded"
              checked={selectedWorkOrderIds.includes(order.id)}
              onChange={(e) => toggleWorkOrderSelection(order.id, e.target.checked)}
            />
            <Link
              href={`/dashboard/admin/work-orders/${order.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7f8ab0] transition-colors hover:text-[#8fb0ff]"
              title="View Work Order Details"
            >
              <Eye className="h-4 w-4 cursor-pointer" />
            </Link>
            <button
              onClick={() => copyWorkOrderInfo(order)}
              className="text-[#7f8ab0] transition-colors hover:text-[#8fb0ff]"
              title="Copy Work Order Info"
            >
              <Clipboard className="h-4 w-4 cursor-pointer" />
            </button>
            <button
              onClick={() => handleExportWorkOrder(order)}
              className="text-[#7f8ab0] transition-colors hover:text-[#8fb0ff]"
              title="Export Work Order PDF"
            >
              <Printer className="h-4 w-4 cursor-pointer" />
            </button>
          </div>
        )
      case "ipl":
        return order.id.slice(-7)
      case "workOrderNumber":
        return order.workOrderNumber || order.id
      case "address":
        return (
          <div className="flex items-center">
            <MapPin className="mr-1 h-4 w-4 text-[#7f8ab0]" />
            {order.addressLine1}
          </div>
        )
      case "zip":
        return order.postalCode
      case "photos":
        return (
          <button
            type="button"
            onClick={() => openPhotoModal(order)}
            className="flex items-center rounded-xl px-2 py-1 text-[#dce5ff] transition hover:bg-white/5 hover:text-white"
            title="Open photos"
          >
            <Image className="mr-1 h-4 w-4 text-[#7f8ab0]" />
            {order._count.files}
          </button>
        )
      case "history":
        return (
          <button
            type="button"
            onClick={() => openHistoryModal(order)}
            className="flex items-center rounded-xl px-2 py-1 text-[#dce5ff] transition hover:bg-white/5 hover:text-white"
            title="Open history"
          >
            <Clock className="mr-1 h-4 w-4 text-[#7f8ab0]" />
            {getPropertyHistoryCount(order)}
          </button>
        )
      case "status":
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
            {statusDisplayName}
          </span>
        )
      case "state":
        return order.state
      case "city":
        return order.city
      case "fieldComplete":
        return order.fieldComplete ? new Date(order.fieldComplete).toLocaleDateString() : ""
      case "client":
        return order.client.name
      case "contractor":
        return order.assignedContractor ? (
          <div className="flex items-center">
            <User className="mr-1 h-4 w-4 text-[#7f8ab0]" />
            <span className="rounded bg-[#e7efff] px-2 py-1 text-xs font-semibold text-[#3f63bc] ring-1 ring-[#c2d4ff]">
              {order.assignedContractor.name}
            </span>
          </div>
        ) : (
          "Unassigned"
        )
      case "dueDate":
        const dueDateMeta = getDueDateMeta(order.dueDate)
        return (
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${dueDateMeta.className}`}>
            {dueDateMeta.label}
          </span>
        )
      default:
        return null
    }
  }

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

  const handleBulkAssign = async () => {
    if (selectedWorkOrderIds.length === 0) {
      alert("Select at least one work order for bulk assign.")
      return
    }
    if (!bulkContractorId && !bulkCoordinatorId && !bulkProcessorId) {
      alert("Provide at least one assignment field.")
      return
    }

    try {
      setBulkActionLoading(true)
      await runBulkUpdate({
        assignedContractorId: bulkContractorId,
        assignedCoordinatorId: bulkCoordinatorId,
        assignedProcessorId: bulkProcessorId,
      })
      await fetchWorkOrders()
      alert("Bulk assignment completed.")
    } catch (error) {
      alert(error instanceof Error ? error.message : "Bulk assignment failed.")
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkStatusUpdate = async () => {
    if (selectedWorkOrderIds.length === 0) {
      alert("Select at least one work order for bulk status update.")
      return
    }
    if (!bulkStatus) {
      alert("Choose a status for bulk update.")
      return
    }
    try {
      setBulkActionLoading(true)
      await runBulkUpdate({ status: bulkStatus })
      await fetchWorkOrders()
      alert("Bulk status update completed.")
    } catch (error) {
      alert(error instanceof Error ? error.message : "Bulk status update failed.")
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handlePrintSelected = () => {
    if (selectedWorkOrderIds.length === 0) {
      alert("Select at least one work order to print.")
      return
    }
    const printable = filteredWorkOrders.filter((order) => selectedWorkOrderIds.includes(order.id))
    const html = `
      <html>
        <head><title>Work Orders Print</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h1>Selected Work Orders</h1>
          ${printable
            .map(
              (order) => `
                <div style="padding:12px; border:1px solid #ddd; margin-bottom:8px;">
                  <div><strong>${order.workOrderNumber || order.id}</strong> - ${order.title}</div>
                  <div>Status: ${getStatusDisplayName(order.status)}</div>
                  <div>Due: ${order.dueDate ? new Date(order.dueDate).toLocaleDateString() : "Not set"}</div>
                  <div>Address: ${order.addressLine1}, ${order.city}, ${order.state} ${order.postalCode}</div>
                </div>
              `
            )
            .join("")}
        </body>
      </html>
    `
    const printWindow = window.open("", "_blank")
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const handleComplianceScan = async () => {
    if (selectedWorkOrderIds.length === 0) {
      alert("Select at least one work order for compliance checklist scan.")
      return
    }

    try {
      setComplianceLoading(true)
      const entries = await Promise.all(
        selectedWorkOrderIds.map(async (id) => {
          const details = await fetchWorkOrderDetails(id)
          if (!details) return [id, [{ key: "load-failed", label: "Pending issue detection unavailable" }]] as const
          return [id, getComplianceIssues(details)] as const
        })
      )
      setComplianceByWorkOrderId(Object.fromEntries(entries))
    } catch (error) {
      console.error("Compliance scan failed:", error)
      alert("Compliance scan failed.")
    } finally {
      setComplianceLoading(false)
    }
  }

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const activeOrders = filteredWorkOrders.filter((order) => !["CLOSED", "CANCELLED"].includes(order.status))
  const overdueOrders = activeOrders.filter((order) => {
    if (!order.dueDate) return false
    const due = new Date(order.dueDate)
    due.setHours(0, 0, 0, 0)
    return due.getTime() < now.getTime()
  })
  const dueSoonOrders = activeOrders.filter((order) => {
    if (!order.dueDate) return false
    const due = new Date(order.dueDate)
    due.setHours(0, 0, 0, 0)
    const diffDays = Math.round((due.getTime() - now.getTime()) / 86400000)
    return diffDays >= 0 && diffDays <= 2
  })
  const pendingReviewOrders = filteredWorkOrders.filter((order) =>
    ["FIELD_COMPLETE", "COMPLETED", "OFFICE_APPROVED"].includes(order.status)
  )
  const unassignedAssetOrders = filteredWorkOrders.filter((order) => !order.assignedContractor?.name)
  const escalatedOrders = [...overdueOrders, ...dueSoonOrders].filter(
    (order, index, arr) => arr.findIndex((candidate) => candidate.id === order.id) === index
  )

  const hasAppliedFilters =
    Object.values(appliedColumnFilters).some((value) => value?.trim()) ||
    Object.entries(appliedStatusFilters).some(([key, value]) => value !== defaultStatusFilters[key as keyof StatusFilters])

  if (loading) {
    return null
  }

  return (
    <div className="min-h-screen rounded-[32px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_52%,#eef4ff_100%)] text-[#435072] shadow-[0_24px_60px_rgba(196,186,255,0.18)]">
      {/* Header */}
      <div className="border-b border-[#ebe5ff] bg-[linear-gradient(135deg,#fff0fa_0%,#f4edff_58%,#edf4ff_100%)] px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#2b3159]">View Work Order</h1>
          <a href="#" className="text-[#cf26dd] hover:text-[#a93bda]">Need Help?</a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-[#ebe5ff] bg-[linear-gradient(180deg,#ffffff_0%,#f9f5ff_100%)]">
        <div className="px-6">
          <nav className="flex space-x-8">
            <button className="rounded-t-[22px] border-b-2 border-[#cf7cf4] bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] px-5 py-4 font-medium text-[#2b3159] shadow-[0_12px_28px_rgba(204,156,255,0.2)]">
              All Work Order
            </button>
            <button className="border-b-2 border-transparent py-4 px-1 text-[#7a86b3] hover:text-[#2b3159]">
              WO Completion Tracker
            </button>
            <button className="border-b-2 border-transparent py-4 px-1 text-[#7a86b3] hover:text-[#2b3159]">
              New Contractor Tracker
            </button>
          </nav>
        </div>
      </div>

      {/* Action and Filter Panel */}
      <div className="border-b border-[#ebe5ff] bg-[linear-gradient(180deg,#fffefe_0%,#f8f4ff_100%)] px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button className="text-sm text-[#7280ad] hover:text-[#2b3159]">Action</button>
            <button className="text-sm text-[#7280ad] hover:text-[#2b3159]">Create Filters</button>
            <button className="text-sm text-[#7280ad] hover:text-[#2b3159]">Load Filters</button>
            <div className="flex items-center space-x-2">
              <button
                onClick={openColumnsModal}
                className="text-sm text-[#7280ad] hover:text-[#2b3159]"
              >
                Columns
              </button>
              <span className="text-sm text-[#16a36f]">{hasAppliedFilters ? "Filters Applied" : "No Filter Applied..."}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={runFilter}
              className="rounded-2xl bg-[linear-gradient(180deg,#4b7ff7_0%,#3468e8_100%)] px-4 py-2 text-sm text-white"
            >
              Run Filter
            </button>
            <button
              onClick={resetFilter}
              className="rounded-2xl bg-[linear-gradient(180deg,#4b7ff7_0%,#3468e8_100%)] px-4 py-2 text-sm text-white"
            >
              Reset Filter
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#e4dcff] bg-white/70 px-3 py-2 text-sm text-[#435072]">
            <div className="font-semibold text-[#2b3159]">Auto Overdue Alerts</div>
            <div>{overdueOrders.length} overdue work orders</div>
          </div>
          <div className="rounded-xl border border-[#e4dcff] bg-white/70 px-3 py-2 text-sm text-[#435072]">
            <div className="font-semibold text-[#2b3159]">Auto Due Reminders</div>
            <div>{dueSoonOrders.length} due in 48 hours</div>
          </div>
          <div className="rounded-xl border border-[#e4dcff] bg-white/70 px-3 py-2 text-sm text-[#435072]">
            <div className="font-semibold text-[#2b3159]">Pending Review</div>
            <div>{pendingReviewOrders.length} work orders awaiting review</div>
          </div>
          <div className="rounded-xl border border-[#e4dcff] bg-white/70 px-3 py-2 text-sm text-[#435072]">
            <div className="font-semibold text-[#2b3159]">Asset Section</div>
            <div>{unassignedAssetOrders.length} unassigned assets</div>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6d78a5]">
              Search by completion task description
            </label>
            <div className="flex items-center rounded-xl border border-[#e4dcff] bg-white px-2">
              <Search className="h-4 w-4 text-[#8a94bd]" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Task description, comment, address..."
                className="w-full rounded-xl px-2 py-2 text-sm text-[#2b3159] outline-none"
              />
            </div>
          </div>
          <input
            value={bulkContractorId}
            onChange={(e) => setBulkContractorId(e.target.value)}
            placeholder="Bulk assign contractor ID"
            className="rounded-xl border border-[#e4dcff] bg-white px-3 py-2 text-sm text-[#2b3159]"
          />
          <input
            value={bulkCoordinatorId}
            onChange={(e) => setBulkCoordinatorId(e.target.value)}
            placeholder="Bulk assign coordinator ID"
            className="rounded-xl border border-[#e4dcff] bg-white px-3 py-2 text-sm text-[#2b3159]"
          />
          <input
            value={bulkProcessorId}
            onChange={(e) => setBulkProcessorId(e.target.value)}
            placeholder="Bulk assign processor ID"
            className="rounded-xl border border-[#e4dcff] bg-white px-3 py-2 text-sm text-[#2b3159]"
          />
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="rounded-xl border border-[#e4dcff] bg-white px-3 py-2 text-sm text-[#2b3159]"
          >
            <option value="">Bulk status update</option>
            {bulkStatusOptions.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={handleBulkAssign}
            disabled={bulkActionLoading}
            className="rounded-xl bg-[#245f9b] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            Bulk Assign
          </button>
          <button
            onClick={handleBulkStatusUpdate}
            disabled={bulkActionLoading}
            className="rounded-xl bg-[#245f9b] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            Bulk Status Update
          </button>
          <button
            onClick={handleExport}
            className="rounded-xl bg-[#2f6fb7] px-3 py-2 text-xs font-semibold text-white"
          >
            Export Work Orders
          </button>
          <button
            onClick={handlePrintSelected}
            className="rounded-xl bg-[#2f6fb7] px-3 py-2 text-xs font-semibold text-white"
          >
            Print Work Orders
          </button>
          <button
            onClick={handleComplianceScan}
            disabled={complianceLoading}
            className="rounded-xl bg-[#1f8f63] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            Work Order Compliance Checklist
          </button>
          <span className="text-xs text-[#6a769f]">
            Selected: {selectedWorkOrderIds.length} • Escalations: {escalatedOrders.length}
          </span>
        </div>

        {/* Status Checkboxes */}
        <div className="flex items-center space-x-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={draftStatusFilters.unassigned}
              onChange={(e) => updateStatusFilter("unassigned", e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-[#435072]">Unassigned</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={draftStatusFilters.assigned}
              onChange={(e) => updateStatusFilter("assigned", e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-[#435072]">Assigned</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={draftStatusFilters.read}
              onChange={(e) => updateStatusFilter("read", e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-[#435072]">Read</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={draftStatusFilters.fieldComplete}
              onChange={(e) => updateStatusFilter("fieldComplete", e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-[#435072]">Field Complete</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={draftStatusFilters.officeApproved}
              onChange={(e) => updateStatusFilter("officeApproved", e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-[#435072]">Office Approved</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={draftStatusFilters.sentToClient}
              onChange={(e) => updateStatusFilter("sentToClient", e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-[#435072]">Sent to Client</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={draftStatusFilters.closed}
              onChange={(e) => updateStatusFilter("closed", e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-[#435072]">Closed</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={draftStatusFilters.cancelled}
              onChange={(e) => updateStatusFilter("cancelled", e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-[#435072]">Cancelled</span>
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[#f0d4db] bg-[#fff5f8] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#a3435c]">Auto Escalation System</div>
            <div className="mt-1 text-sm text-[#7f3045]">{escalatedOrders.length} flagged by due-date risk</div>
          </div>
          <div className="rounded-xl border border-[#d9e7ff] bg-[#f4f8ff] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#355ea6]">Pending Review Section</div>
            <div className="mt-1 text-sm text-[#2f4f85]">
              {pendingReviewOrders.slice(0, 2).map((order) => order.workOrderNumber || order.id).join(", ") || "No pending review items"}
            </div>
          </div>
          <div className="rounded-xl border border-[#d7efe0] bg-[#f2fbf6] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1d7a53]">Asset Section</div>
            <div className="mt-1 text-sm text-[#1f6348]">
              {unassignedAssetOrders.slice(0, 2).map((order) => order.workOrderNumber || order.id).join(", ") || "All active orders assigned"}
            </div>
          </div>
        </div>

        {!!Object.keys(complianceByWorkOrderId).length && (
          <div className="mt-4 rounded-xl border border-[#e3dcff] bg-white/80 p-3">
            <div className="mb-2 text-sm font-semibold text-[#2b3159]">Service-specific compliance rules and pending issue detection</div>
            <div className="space-y-2 text-xs text-[#4b567e]">
              {Object.entries(complianceByWorkOrderId).map(([workOrderId, issues]) => (
                <div key={workOrderId}>
                  <span className="font-semibold">{workOrderId.slice(-7)}:</span>{" "}
                  {issues.length
                    ? issues.map((issue) => issue.label).join(" | ")
                    : "Compliance checks passed (Before / During / After photos, lock change compliance, lockbox verification, key code verification)."}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Data Table with Column Filters */}
      <div className="bg-[linear-gradient(180deg,#fffefe_0%,#f8f4ff_52%,#eef4ff_100%)]">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            {/* Column Headers with Filters */}
            <thead className="bg-[linear-gradient(180deg,#f7f3ff_0%,#eef4ff_100%)]">
              <tr>
                {columnOrder.map((column) => (
                  <th
                    key={column}
                    draggable
                    onDragStart={() => handleColumnDragStart(column)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleColumnDrop(column)}
                    onDragEnd={() => setDraggedColumn(null)}
                    className={`cursor-move px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                      draggedColumn === column ? "bg-[#efe8ff] text-[#2b3159]" : "text-[#7280ad]"
                    }`}
                    title="Drag to reorder columns"
                  >
                    <div className="flex items-center gap-2">
                      <span>{getColumnHeaderLabel(column)}</span>
                      <span className="text-[10px] text-[#9ba5c9]">⋮⋮</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            {/* Filter Row */}
            <thead className="bg-[linear-gradient(180deg,#fffefe_0%,#f8f4ff_100%)]">
              <tr>
                {columnOrder.map((column) => (
                  <th key={column} className="px-4 py-2">
                    {renderColumnFilter(column)}
                  </th>
                ))}
              </tr>
            </thead>
            
            {/* Data Rows */}
            <tbody className="bg-transparent">
              {paginatedWorkOrders.map((order) => {
                const isSelected = selectedWorkOrderIds.includes(order.id)
                return (
                  <tr
                    key={order.id}
                    className={
                      isSelected
                        ? "border-b border-[#d9d0ff] bg-[linear-gradient(180deg,#f7f0ff_0%,#edf4ff_100%)] shadow-[inset_4px_0_0_0_rgba(207,38,221,0.9)] hover:bg-[#f5efff]"
                        : "border-b border-[#d9d0ff] hover:bg-[#faf7ff]"
                    }
                  >
                    {columnOrder.map((column) => (
                      <td key={`${order.id}-${column}`} className="whitespace-nowrap px-4 py-3 text-sm text-[#435072]">
                        {renderColumnCell(column, order)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
      <div className="flex items-center justify-between border-t border-[#ebe5ff] bg-[linear-gradient(180deg,#fffefe_0%,#f8f4ff_100%)] px-4 py-3 sm:px-6">
          <div className="flex items-center">
            <span className="text-sm text-[#5b6994]">
              Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
              <span className="font-medium">{Math.min(endIndex, filteredWorkOrders.length)}</span> of{" "}
              <span className="font-medium">{filteredWorkOrders.length}</span> results
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md border border-[#e2dbff] bg-[linear-gradient(135deg,#ffffff_0%,#edf4ff_100%)] px-2 py-2 text-sm font-medium text-[#5b6994] hover:border-[#d3c9ff] hover:bg-[#faf7ff] disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="relative inline-flex items-center border border-[#d8b9ff] bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] px-4 py-2 text-sm font-medium text-[#2b3159]">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md border border-[#e2dbff] bg-[linear-gradient(135deg,#ffffff_0%,#edf4ff_100%)] px-2 py-2 text-sm font-medium text-[#5b6994] hover:border-[#d3c9ff] hover:bg-[#faf7ff] disabled:opacity-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="ml-4 rounded-xl border border-[#e2dbff] bg-[linear-gradient(135deg,#ffffff_0%,#edf4ff_100%)] px-3 py-1 text-sm text-[#2b3159]"
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
      {showColumnsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1020]/75 p-6 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-[28px] border border-white/10 bg-[#1f2740] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Columns</h2>
                <p className="mt-1 text-sm text-[#9aa6cc]">Drag items between Active and Inactive. Drag within Active to reorder the table.</p>
              </div>
              <button
                onClick={() => setShowColumnsModal(false)}
                className="rounded-2xl border border-white/10 bg-[#2a3453] px-4 py-2 text-sm text-[#dbe5ff] hover:bg-[#334061]"
              >
                Close
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 text-3xl font-semibold text-white">Active</h3>
                <div
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDraftColumnDrop("active")}
                  className="h-[420px] overflow-y-auto rounded-[24px] border border-white/10 bg-[#242c45] p-4"
                >
                  <div className="space-y-2">
                    {activeColumns.map((column) => (
                      <button
                        key={`active-${column}`}
                        draggable
                        onDragStart={() => setDraggedDraftColumn(column)}
                        onDragEnd={() => setDraggedDraftColumn(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleDraftColumnDrop("active", column)}
                        type="button"
                        className="flex w-full items-center justify-between rounded-2xl bg-[#2e3858] px-5 py-4 text-left text-[#edf2ff] transition hover:bg-[#384466]"
                      >
                        <span className="text-xl">{getColumnHeaderLabel(column)}</span>
                        <span className="text-xs text-[#8fa2d9]">drag</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-3xl font-semibold text-white">Inactive</h3>
                <div
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDraftColumnDrop("inactive")}
                  className="h-[420px] overflow-y-auto rounded-[24px] border border-white/10 bg-[#242c45] p-4"
                >
                  <div className="space-y-2">
                    {inactiveColumns.map((column) => (
                      <button
                        key={`inactive-${column}`}
                        draggable
                        onDragStart={() => setDraggedDraftColumn(column)}
                        onDragEnd={() => setDraggedDraftColumn(null)}
                        type="button"
                        className="flex w-full items-center justify-between rounded-2xl bg-[#2e3858] px-5 py-4 text-left text-[#edf2ff] transition hover:bg-[#384466]"
                      >
                        <span className="text-xl">{getColumnHeaderLabel(column)}</span>
                        <span className="text-xs text-[#8fa2d9]">drag</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={applyColumnChanges}
                className="rounded-2xl bg-[#1d4f82] px-6 py-3 text-lg font-medium text-white shadow-[0_8px_24px_rgba(18,68,120,0.35)] hover:bg-[#245f9b]"
              >
                Update
              </button>
              <button
                onClick={() => setShowColumnsModal(false)}
                className="rounded-2xl bg-[#1d4f82] px-6 py-3 text-lg font-medium text-white shadow-[0_8px_24px_rgba(18,68,120,0.35)] hover:bg-[#245f9b]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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

      {historyModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060914]/78 p-6 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-7xl overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#1b2236_0%,#131a2b_100%)] shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-white">Property History</h2>
                <p className="mt-1 text-sm text-[#9aa6cc]">
                  {historyModalOrder.addressLine1}, {historyModalOrder.city}, {historyModalOrder.state}
                </p>
              </div>
              <button
                onClick={() => setHistoryModalOrder(null)}
                className="rounded-2xl border border-white/10 bg-[#2a334c] p-2 text-[#dce5ff] hover:bg-[#34405f]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(88vh-88px)] overflow-y-auto p-6">
              <div className="mb-5 flex flex-wrap gap-2">
                {propertyHistoryTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveHistoryTab(tab.key)
                      setHistoryCommentSearch("")
                      setHistoryColumnFilters({})
                    }}
                    className={
                      activeHistoryTab === tab.key
                        ? "rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-4 py-2 text-sm font-medium text-white"
                        : "rounded-2xl border border-white/8 bg-[#27304a] px-4 py-2 text-sm font-medium text-[#c7d2f3] hover:bg-[#303a58] hover:text-white"
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {(showingBidHistory || showingCompletionHistory) && (
                <div className="mb-5 max-w-md">
                  <input
                    type="text"
                    value={historyCommentSearch}
                    onChange={(e) => setHistoryCommentSearch(e.target.value)}
                    placeholder={`Search ${showingBidHistory ? "bid" : "completion"} comments...`}
                    className="w-full rounded-2xl border border-white/10 bg-[#1f2941] px-4 py-2.5 text-sm text-[#edf2ff] outline-none placeholder:text-[#7f8bb1] focus:border-[#ff7a49]/60"
                  />
                </div>
              )}

              {historyModalLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#ff6b3c]" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full overflow-hidden rounded-[24px] border border-white/8">
                    <thead className="bg-[#27304a]">
                      <tr>
                        {showingBidHistory ? (
                          <>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Action</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">CTIC</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Status</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Work Order #</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Pics</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Work Type</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Contractor</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Date</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Task</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Qty</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Contractor</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Client</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Comments</th>
                          </>
                        ) : showingCompletionHistory ? (
                          <>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Action</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">IPL NO</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Work Order</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Status</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Work Type</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Task</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Qty</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Comments</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Photos</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Contractor</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Due Date</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Address</th>
                          </>
                        ) : showingInvoiceHistory ? (
                          <>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Action</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">IPL NO</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Work Order</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Invoice #</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Invoice Status</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Invoice Total</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Invoice Date</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Address</th>
                          </>
                        ) : (
                          <>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Action</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">IPL NO</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Work Order</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Status</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Work Type</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Photos</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Contractor</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Due Date</th>
                            <th className="px-3 py-3 text-left text-sm font-medium text-[#dce5ff]">Address</th>
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
                                <input value={historyColumnFilters.ctic || ""} onChange={(e) => setHistoryColumnFilter("ctic", e.target.value)} placeholder="CTIC" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.status || ""} onChange={(e) => setHistoryColumnFilter("status", e.target.value)} placeholder="Status" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.workOrderNumber || ""} onChange={(e) => setHistoryColumnFilter("workOrderNumber", e.target.value)} placeholder="Work order #" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.pics || ""} onChange={(e) => setHistoryColumnFilter("pics", e.target.value)} placeholder="Pics" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.workType || ""} onChange={(e) => setHistoryColumnFilter("workType", e.target.value)} placeholder="Work type" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.contractor || ""} onChange={(e) => setHistoryColumnFilter("contractor", e.target.value)} placeholder="Contractor" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.date || ""} onChange={(e) => setHistoryColumnFilter("date", e.target.value)} placeholder="Date" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.task || ""} onChange={(e) => setHistoryColumnFilter("task", e.target.value)} placeholder="Task" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.qty || ""} onChange={(e) => setHistoryColumnFilter("qty", e.target.value)} placeholder="Qty" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.contractorPrice || ""} onChange={(e) => setHistoryColumnFilter("contractorPrice", e.target.value)} placeholder="Contractor total" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.clientPrice || ""} onChange={(e) => setHistoryColumnFilter("clientPrice", e.target.value)} placeholder="Client total" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.comments || ""} onChange={(e) => setHistoryColumnFilter("comments", e.target.value)} placeholder="Comments" className={historyFilterInputClassName} />
                              </th>
                            </>
                          ) : (
                            <>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.iplNo || ""} onChange={(e) => setHistoryColumnFilter("iplNo", e.target.value)} placeholder="IPL NO" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.workOrderNumber || ""} onChange={(e) => setHistoryColumnFilter("workOrderNumber", e.target.value)} placeholder="Work order #" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.status || ""} onChange={(e) => setHistoryColumnFilter("status", e.target.value)} placeholder="Status" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.workType || ""} onChange={(e) => setHistoryColumnFilter("workType", e.target.value)} placeholder="Work type" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.task || ""} onChange={(e) => setHistoryColumnFilter("task", e.target.value)} placeholder="Task" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.qty || ""} onChange={(e) => setHistoryColumnFilter("qty", e.target.value)} placeholder="Qty" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.comments || ""} onChange={(e) => setHistoryColumnFilter("comments", e.target.value)} placeholder="Comments" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.pics || ""} onChange={(e) => setHistoryColumnFilter("pics", e.target.value)} placeholder="Photos" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.contractor || ""} onChange={(e) => setHistoryColumnFilter("contractor", e.target.value)} placeholder="Contractor" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.date || ""} onChange={(e) => setHistoryColumnFilter("date", e.target.value)} placeholder="Date" className={historyFilterInputClassName} />
                              </th>
                              <th className="border-b border-white/8 px-3 py-2">
                                <input value={historyColumnFilters.address || ""} onChange={(e) => setHistoryColumnFilter("address", e.target.value)} placeholder="Address" className={historyFilterInputClassName} />
                              </th>
                            </>
                          )}
                        </tr>
                      )}
                    </thead>
                    <tbody className="bg-[#1f2941]">
                      {activeHistoryRows.length > 0 ? (
                        activeHistoryRows.map((row) => (
                          <tr key={`${activeHistoryTab}-${row.id}`} className="border-t border-white/8">
                            {showingBidHistory ? (
                              <>
                                <td className="px-3 py-3 text-sm">
                                  <div className="flex flex-wrap gap-2">
                                    <Link href={`/dashboard/admin/work-orders/${row.workOrderId || row.id}`} className="inline-flex items-center rounded-xl border border-[#7da2ff]/25 bg-[#27304a] px-3 py-1 text-xs font-medium text-[#7da2ff] hover:text-[#a9c0ff]">
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
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.status || "-"}</td>
                                <td className="px-3 py-3 text-sm font-medium text-white">{row.workOrderNumber}</td>
                                <td className="px-3 py-3 text-sm">
                                  <button
                                    type="button"
                                    onClick={() => openPhotoModalByHistoryRow(row)}
                                    className="inline-flex items-center rounded-xl px-2 py-1 text-[#57d2a6] transition hover:bg-white/5 hover:text-[#8ce8b1]"
                                  >
                                    <Image className="mr-1 h-4 w-4" />
                                    {row.pics ?? 0}
                                  </button>
                                </td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{formatHistoryWorkType(row.workType)}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.contractor || "-"}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.date ? new Date(row.date).toLocaleDateString() : "-"}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.task || "-"}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.qty ?? 0}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">${(row.contractorTotal || 0).toFixed(2)}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">${(row.clientTotal || 0).toFixed(2)}</td>
                                <td className="px-3 py-3 text-sm text-[#9aa6cc]">
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
                                <td className="px-3 py-3 text-sm">
                                  <div className="flex flex-wrap gap-2">
                                    <Link href={`/dashboard/admin/work-orders/${row.workOrderId || row.id}`} className="inline-flex items-center rounded-xl border border-[#7da2ff]/25 bg-[#27304a] px-3 py-1 text-xs font-medium text-[#7da2ff] hover:text-[#a9c0ff]">
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
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.iplNo || "-"}</td>
                                <td className="px-3 py-3 text-sm font-medium text-white">{row.workOrderNumber}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.status || "-"}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{formatHistoryWorkType(row.workType)}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.task || "-"}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.qty ?? 0}</td>
                                <td className="px-3 py-3 text-sm text-[#9aa6cc]">
                                  {row.comments ? (
                                    <span title={row.comments}>
                                      {row.comments.length > 120 ? `${row.comments.slice(0, 120)}... ` : row.comments}
                                      {row.comments.length > 120 && <span className="text-[#7da2ff]">See more</span>}
                                    </span>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td className="px-3 py-3 text-sm">
                                  <button
                                    type="button"
                                    onClick={() => openPhotoModalByHistoryRow(row)}
                                    className="inline-flex items-center rounded-xl px-2 py-1 text-[#57d2a6] transition hover:bg-white/5 hover:text-[#8ce8b1]"
                                  >
                                    <Image className="mr-1 h-4 w-4" />
                                    {row.photoCount ?? 0}
                                  </button>
                                </td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.contractor || "-"}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "-"}</td>
                                <td className="px-3 py-3 text-sm text-[#9aa6cc]">{row.address || "-"}</td>
                              </>
                            ) : showingInvoiceHistory ? (
                              <>
                                <td className="px-3 py-3 text-sm">
                                  <Link href={`/dashboard/admin/work-orders/${row.id}`} className="inline-flex items-center rounded-xl border border-[#7da2ff]/25 bg-[#27304a] px-3 py-1 text-xs font-medium text-[#7da2ff] hover:text-[#a9c0ff]">
                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                    Open
                                  </Link>
                                </td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.iplNo || "-"}</td>
                                <td className="px-3 py-3 text-sm font-medium text-white">{row.workOrderNumber}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.invoiceNumber || "-"}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.invoiceStatus || "-"}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">${(row.invoiceTotal || 0).toFixed(2)}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString() : "-"}</td>
                                <td className="px-3 py-3 text-sm text-[#9aa6cc]">{row.address || "-"}</td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-3 text-sm">
                                  <Link href={`/dashboard/admin/work-orders/${row.id}`} className="inline-flex items-center rounded-xl border border-[#7da2ff]/25 bg-[#27304a] px-3 py-1 text-xs font-medium text-[#7da2ff] hover:text-[#a9c0ff]">
                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                    Open
                                  </Link>
                                </td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.iplNo || "-"}</td>
                                <td className="px-3 py-3 text-sm font-medium text-white">{row.workOrderNumber}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.status || "-"}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{formatHistoryWorkType(row.workType)}</td>
                                <td className="px-3 py-3 text-sm">
                                  <button
                                    type="button"
                                    onClick={() => openPhotoModalById(row.id)}
                                    className="inline-flex items-center rounded-xl px-2 py-1 text-[#57d2a6] transition hover:bg-white/5 hover:text-[#8ce8b1]"
                                  >
                                    <Image className="mr-1 h-4 w-4" />
                                    {row.photoCount ?? 0}
                                  </button>
                                </td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.contractor || "-"}</td>
                                <td className="px-3 py-3 text-sm text-[#edf2ff]">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "-"}</td>
                                <td className="px-3 py-3 text-sm text-[#9aa6cc]">{row.address || "-"}</td>
                              </>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={showingBidHistory ? 13 : showingCompletionHistory ? 12 : showingInvoiceHistory ? 8 : 9} className="px-3 py-8 text-center text-[#9aa6cc]">
                            No historical data available for {propertyHistoryTabs.find((tab) => tab.key === activeHistoryTab)?.label.toLowerCase()}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {photoModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060914]/78 p-6 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#1b2236_0%,#131a2b_100%)] shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-white">Work Order Photos</h2>
                <p className="mt-1 text-sm text-[#9aa6cc]">
                  {photoModalOrder.workOrderNumber || photoModalOrder.id} • {photoModalOrder.addressLine1}
                </p>
              </div>
              <button
                onClick={() => setPhotoModalOrder(null)}
                className="rounded-2xl border border-white/10 bg-[#2a334c] p-2 text-[#dce5ff] hover:bg-[#34405f]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(88vh-88px)] overflow-y-auto p-6">
              {photoModalLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#ff6b3c]" />
                </div>
              ) : photoModalFiles.length > 0 ? (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/8 bg-[#1d2438] p-4">
                    <div className="text-sm text-[#dce5ff]">
                      <span className="font-medium text-white">{selectedPhotoIds.length}</span> selected of{" "}
                      <span className="font-medium text-white">{photoModalFiles.length}</span> photos
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={toggleSelectAllPhotos}
                        className="rounded-xl border border-white/10 bg-[#27304a] px-4 py-2 text-sm font-medium text-[#dce5ff] hover:bg-[#303a58] hover:text-white"
                      >
                        {selectedPhotoIds.length === photoModalFiles.length ? "Clear Selection" : "Select All"}
                      </button>
                      <button
                        type="button"
                        onClick={downloadSelectedPhotos}
                        disabled={selectedPhotoIds.length === 0}
                        className="rounded-xl border border-white/10 bg-[#27304a] px-4 py-2 text-sm font-medium text-[#dce5ff] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#303a58] hover:text-white"
                      >
                        Download Selected
                      </button>
                      <button
                        type="button"
                        onClick={downloadAllPhotos}
                        className="rounded-xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(255,107,60,0.24)] hover:brightness-105"
                      >
                        Download All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {photoModalFiles.map((file, index) => {
                      const isSelected = selectedPhotoIds.includes(file.id)

                      return (
                        <div
                          key={file.id}
                          className={`overflow-hidden rounded-[24px] border bg-[#202841] text-left transition ${
                            isSelected
                              ? "border-[#ff7a49]/70 ring-2 ring-[#ff7a49]/30"
                              : "border-white/8 hover:border-[#7da2ff]/35 hover:bg-[#26304c]"
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                            <label className="flex items-center gap-2 text-sm text-[#dce5ff]">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePhotoSelection(file.id)}
                                className="h-4 w-4 rounded border-white/20 bg-[#1b2236] text-[#ff7a49] focus:ring-[#ff7a49]"
                              />
                              Select
                            </label>
                            <button
                              type="button"
                              onClick={() => triggerPhotoDownload(file)}
                              className="inline-flex items-center rounded-xl border border-white/8 bg-[#27304a] px-3 py-1.5 text-xs font-medium text-[#dce5ff] hover:text-white"
                            >
                              <Download className="mr-1 h-3.5 w-3.5" />
                              Download
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setPhotoLightbox({
                                open: true,
                                images: photoModalFiles.map((item) => ({ id: item.id, url: item.url })),
                                index,
                              })
                            }
                            className="block w-full text-left"
                          >
                            <img src={file.url} alt={file.category} className="h-48 w-full object-cover" />
                            <div className="p-4">
                              <div className="text-sm font-medium text-white">{file.category.replaceAll("_", " ")}</div>
                              <div className="mt-1 text-xs text-[#9aa6cc]">{file.id}</div>
                            </div>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-[#1d2438] px-6 py-16 text-center text-[#9aa6cc]">
                  No photos available for this work order.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {photoLightbox.open && (
        <PhotoEditorModal
          images={photoLightbox.images}
          index={photoLightbox.index}
          open={photoLightbox.open}
          onIndexChange={(index) =>
            setPhotoLightbox((prev) => ({
              ...prev,
              index,
            }))
          }
          onClose={() => setPhotoLightbox({ open: false, images: [], index: 0 })}
        />
      )}
    </div>
  )
}
