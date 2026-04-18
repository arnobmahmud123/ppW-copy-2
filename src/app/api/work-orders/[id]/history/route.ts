import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

type HistoryTab =
  | "past"
  | "bid"
  | "completion"
  | "damage"
  | "appliance"
  | "violation"
  | "hazard"
  | "contractorInvoice"
  | "clientInvoice"

type RawTask = Record<string, unknown>

function parseTasks(tasks: string | null) {
  if (!tasks) return []
  try {
    const parsed = JSON.parse(tasks)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function hasTaskMatch(
  tasks: RawTask[],
  predicate: (task: RawTask) => boolean
) {
  return tasks.some(predicate)
}

function isBidTask(task: RawTask) {
  const taskType = String(task.taskType || "").toLowerCase()
  const taskName = String(task.taskName || task.customTaskName || "").toLowerCase()
  return taskType === "bid" || taskName.includes("(bid)") || taskName.includes("bid")
}

function normalizePhotoType(value: unknown) {
  const normalized = String(value || "").toUpperCase()
  return normalized.startsWith("PHOTO_") ? normalized.replace("PHOTO_", "") : normalized
}

function countTaskPhotos(task: RawTask, photoTypes: string[]) {
  const normalizedTargetTypes = photoTypes.map(normalizePhotoType)
  return Array.isArray(task.photoRequirements)
    ? task.photoRequirements.reduce((sum, requirement: any) => {
        const requirementMatches =
          normalizedTargetTypes.includes(normalizePhotoType(requirement?.type)) ||
          normalizedTargetTypes.includes(normalizePhotoType(requirement?.label)) ||
          normalizedTargetTypes.some((type) => String(requirement?.id || "").toUpperCase().includes(type))

        if (!requirementMatches) return sum

        const uploads = Array.isArray(requirement?.uploads) ? requirement.uploads.length : 0
        return sum + uploads
      }, 0)
    : 0
}

function mapHistoryRow(workOrder: any) {
  return {
    id: workOrder.id,
    iplNo: workOrder.workOrderNumber || workOrder.id.slice(-8),
    workOrderNumber: workOrder.workOrderNumber || workOrder.title,
    status: workOrder.status,
    workType: workOrder.serviceType,
    photoCount: workOrder._count?.files ?? 0,
    contractor: workOrder.assignedContractor?.name || workOrder.contractorName || "Unassigned",
    dueDate: workOrder.dueDate,
    address: [workOrder.addressLine1, workOrder.city, workOrder.state].filter(Boolean).join(", "),
    invoiceNumber: workOrder.invoice?.invoiceNumber || null,
    invoiceStatus: workOrder.invoice?.status || null,
    invoiceTotal: workOrder.invoice?.clientTotal || 0,
    invoiceDate: workOrder.invoice?.invoiceDate || null,
  }
}

function mapBidHistoryRow(workOrder: any, task: RawTask) {
  const taskName = String(task.taskName || task.customTaskName || "Bid Item")
  const qty = Number(task.qty || 0)
  const contractorPrice = Number(task.contractorPrice || 0)
  const clientPrice = Number(task.clientPrice || 0)
  const photoTypes = ["BID"]
  const photos = countTaskPhotos(task, photoTypes)

  return {
    id: `${workOrder.id}:${String(task.id || taskName)}`,
    workOrderId: workOrder.id,
    taskId: String(task.id || ""),
    photoTypes,
    ctic: workOrder.id.slice(-4),
    status: workOrder.status,
    workOrderNumber: workOrder.workOrderNumber || workOrder.title,
    pics: photos,
    workType: workOrder.serviceType,
    contractor: workOrder.assignedContractor?.name || workOrder.contractorName || "Unassigned",
    date: workOrder.dueDate,
    task: taskName.replace(/\s*\(bid\)\s*/gi, "").trim(),
    qty,
    contractorPrice,
    contractorTotal: contractorPrice * qty,
    clientPrice,
    clientTotal: clientPrice * qty,
    comments: String(task.comments || ""),
  }
}

function mapCompletionHistoryRow(workOrder: any, task: RawTask) {
  const taskName = String(task.taskName || task.customTaskName || "Completion Task")
  const qty = Number(task.qty || 0)
  const photoTypes = ["BEFORE", "DURING", "AFTER"]
  const photoCount = countTaskPhotos(task, photoTypes)

  return {
    id: `${workOrder.id}:${String(task.id || taskName)}`,
    workOrderId: workOrder.id,
    taskId: String(task.id || ""),
    photoTypes,
    iplNo: workOrder.workOrderNumber || workOrder.id.slice(-8),
    workOrderNumber: workOrder.workOrderNumber || workOrder.title,
    status: workOrder.status,
    workType: workOrder.serviceType,
    photoCount,
    contractor: workOrder.assignedContractor?.name || workOrder.contractorName || "Unassigned",
    dueDate: workOrder.dueDate,
    address: [workOrder.addressLine1, workOrder.city, workOrder.state].filter(Boolean).join(", "),
    task: taskName,
    qty,
    comments: String(task.comments || ""),
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const current = await prisma.workOrder.findUnique({
      where: { id },
      select: {
        id: true,
        addressLine1: true,
        city: true,
        state: true,
      },
    })

    if (!current) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 })
    }

    const historyWorkOrders = await prisma.workOrder.findMany({
      where: {
        id: {
          not: current.id,
        },
        addressLine1: current.addressLine1,
        city: current.city,
        state: current.state,
      },
      include: {
        assignedContractor: {
          select: {
            name: true,
          },
        },
        invoice: true,
        _count: {
          select: {
            files: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const rowsWithTasks = historyWorkOrders.map((workOrder) => ({
      ...mapHistoryRow(workOrder),
      rawTasks: parseTasks(workOrder.tasks),
    }))

    const filterByTab = (tab: HistoryTab) => {
      switch (tab) {
        case "past":
          return rowsWithTasks
        case "bid":
          return rowsWithTasks.flatMap((row) =>
            row.rawTasks.filter(isBidTask).map((task) => mapBidHistoryRow(row, task))
          )
        case "completion":
          return rowsWithTasks.flatMap((row) =>
            row.rawTasks
              .filter((task) => String(task.taskType || "").toLowerCase() === "completion")
              .map((task) => mapCompletionHistoryRow(row, task))
          )
        case "damage":
          return rowsWithTasks.filter((row) =>
            hasTaskMatch(row.rawTasks, (task) => Boolean(task.damage))
          )
        case "appliance":
          return rowsWithTasks.filter((row) =>
            hasTaskMatch(row.rawTasks, (task) => String(task.taskName || task.customTaskName || "").toLowerCase().includes("appliance"))
          )
        case "violation":
          return rowsWithTasks.filter((row) =>
            hasTaskMatch(row.rawTasks, (task) => Boolean(task.violation))
          )
        case "hazard":
          return rowsWithTasks.filter((row) =>
            hasTaskMatch(row.rawTasks, (task) => Boolean(task.hazards))
          )
        case "contractorInvoice":
        case "clientInvoice":
          return rowsWithTasks.filter((row) => Boolean(row.invoiceNumber))
        default:
          return rowsWithTasks
      }
    }

    const response = {
      past: filterByTab("past"),
      bid: filterByTab("bid"),
      completion: filterByTab("completion"),
      damage: filterByTab("damage"),
      appliance: filterByTab("appliance"),
      violation: filterByTab("violation"),
      hazard: filterByTab("hazard"),
      contractorInvoice: filterByTab("contractorInvoice"),
      clientInvoice: filterByTab("clientInvoice"),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Property history fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
