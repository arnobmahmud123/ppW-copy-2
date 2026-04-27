import "server-only"

import { db } from "@/lib/db"
import { buildPropertyIdentityFromAddress, buildPropertyKey } from "@/modules/properties/propertyKey"
import type {
  PropertyDetailResponse,
  PropertyDocumentItem,
  PropertyGalleryItem,
  PropertyListItem,
  PropertyNoteItem,
  PropertyStatusSummary,
  PropertyTimelineEvent,
  PropertyWorkOrderHistoryRow,
} from "@/modules/properties/types"
import type { PropertyAddressLike } from "@/modules/properties/propertyKey"

type RawTask = Record<string, unknown>

type PropertyIdentity = PropertyAddressLike

const PHOTO_CATEGORIES = [
  "PHOTO_BEFORE",
  "PHOTO_DURING",
  "PHOTO_AFTER",
  "PHOTO_BID",
  "PHOTO_INSPECTION",
] as const

const ACTIVE_STATUSES = new Set([
  "NEW",
  "UNASSIGNED",
  "IN_PROGRESS",
  "ASSIGNED",
  "READ",
  "FIELD_COMPLETE",
  "OFFICE_APPROVED",
  "SENT_TO_CLIENT",
])

const COMPLETED_STATUSES = new Set([
  "COMPLETED",
  "FIELD_COMPLETE",
  "OFFICE_APPROVED",
  "SENT_TO_CLIENT",
  "CLOSED",
])

function buildPropertyIdentityFromRecord(record: PropertyIdentity): PropertyIdentity {
  return buildPropertyIdentityFromAddress(record)
}

function parsePropertyKey(propertyKey: string): PropertyIdentity | null {
  try {
    const parsed = JSON.parse(Buffer.from(propertyKey, "base64url").toString("utf8")) as Partial<PropertyIdentity>
    if (!parsed.addressLine1 || !parsed.city || !parsed.state || !parsed.postalCode) {
      return null
    }

    return buildPropertyIdentityFromRecord({
      addressLine1: parsed.addressLine1,
      city: parsed.city,
      state: parsed.state,
      postalCode: parsed.postalCode,
    })
  } catch {
    return null
  }
}

function isOverdue(status: string, dueDate: Date | null) {
  if (!dueDate || !ACTIVE_STATUSES.has(status)) return false
  return dueDate.getTime() < Date.now()
}

function formatParticipantName(name: string | null | undefined) {
  const trimmed = name?.trim()
  return trimmed ? trimmed : null
}

function parseTasks(tasks: string | null | undefined): RawTask[] {
  if (!tasks) return []
  try {
    const parsed = JSON.parse(tasks)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getTaskNumber(task: RawTask, key: string) {
  const value = Number(task[key] ?? 0)
  return Number.isFinite(value) ? value : 0
}

function getTaskTotal(task: RawTask, unitKey: "clientPrice" | "contractorPrice") {
  return getTaskNumber(task, "qty") * getTaskNumber(task, unitKey)
}

function getTaskType(task: RawTask) {
  return String(task.taskType || "").trim().toLowerCase()
}

function pickFrontOfHousePhoto(files: { url: string; category: string }[]) {
  const before = files.find((f) => f.category === "PHOTO_BEFORE")
  return before?.url ?? files[0]?.url ?? null
}

export async function getAdminPropertiesOverview(): Promise<PropertyListItem[]> {
  const workOrders = await db.workOrder.findMany({
    select: {
      id: true,
      title: true,
      workOrderNumber: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      status: true,
      serviceType: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
      client: {
        select: {
          name: true,
          company: true,
        },
      },
      assignedContractor: {
        select: {
          name: true,
          company: true,
        },
      },
      invoice: {
        select: {
          id: true,
          status: true,
          clientTotal: true,
        },
      },
      files: {
        where: {
          category: {
            in: [...PHOTO_CATEGORIES],
          },
        },
        select: {
          id: true,
          url: true,
          category: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      },
      _count: {
        select: {
          files: true,
        },
      },
    },
    orderBy: [
      { updatedAt: "desc" },
      { createdAt: "desc" },
    ],
  })

  const grouped = new Map<
    string,
    PropertyListItem & {
      latestUpdateTime: number
      nextDueDateTime: number | null
      clientSet: Set<string>
      contractorSet: Set<string>
      serviceSet: Set<string>
      hasBeforeFront: boolean
    }
  >()

  for (const workOrder of workOrders) {
    const propertyKey = buildPropertyKey(workOrder)
    const latestUpdateTime = new Date(workOrder.updatedAt).getTime()
    const dueTime = workOrder.dueDate ? new Date(workOrder.dueDate).getTime() : null
    const clientLabel = formatParticipantName(workOrder.client.company) || formatParticipantName(workOrder.client.name)
    const contractorLabel =
      formatParticipantName(workOrder.assignedContractor?.company) ||
      formatParticipantName(workOrder.assignedContractor?.name)

    if (!grouped.has(propertyKey)) {
      grouped.set(propertyKey, {
        propertyKey,
        addressLine1: workOrder.addressLine1,
        addressLine2: workOrder.addressLine2 ?? null,
        city: workOrder.city,
        state: workOrder.state,
        postalCode: workOrder.postalCode,
        frontImageUrl: pickFrontOfHousePhoto(workOrder.files),
        totalWorkOrders: 0,
        openWorkOrders: 0,
        completedWorkOrders: 0,
        overdueWorkOrders: 0,
        invoiceReadyWorkOrders: 0,
        totalInvoices: 0,
        totalPhotos: 0,
        latestUpdateAt: workOrder.updatedAt.toISOString(),
        nextDueDate: workOrder.dueDate?.toISOString() ?? null,
        clients: [],
        contractors: [],
        serviceTypes: [],
        latestWorkOrder: {
          id: workOrder.id,
          workOrderNumber: workOrder.workOrderNumber ?? null,
          title: workOrder.title,
          status: workOrder.status,
        },
        latestUpdateTime,
        nextDueDateTime: dueTime,
        clientSet: new Set<string>(),
        contractorSet: new Set<string>(),
        serviceSet: new Set<string>(),
        hasBeforeFront: workOrder.files.some((f) => f.category === "PHOTO_BEFORE"),
      })
    }

    const aggregate = grouped.get(propertyKey)!
    aggregate.totalWorkOrders += 1
    aggregate.totalPhotos += workOrder._count.files

    if (ACTIVE_STATUSES.has(workOrder.status)) {
      aggregate.openWorkOrders += 1
    }

    if (COMPLETED_STATUSES.has(workOrder.status)) {
      aggregate.completedWorkOrders += 1
    }

    if (isOverdue(workOrder.status, workOrder.dueDate)) {
      aggregate.overdueWorkOrders += 1
    }

    if (workOrder.status === "OFFICE_APPROVED" || workOrder.invoice?.status === "DRAFT") {
      aggregate.invoiceReadyWorkOrders += 1
    }

    if (workOrder.invoice) {
      aggregate.totalInvoices += 1
    }

    if (clientLabel) {
      aggregate.clientSet.add(clientLabel)
    }

    if (contractorLabel) {
      aggregate.contractorSet.add(contractorLabel)
    }

    aggregate.serviceSet.add(workOrder.serviceType)

    const nextFront = pickFrontOfHousePhoto(workOrder.files)
    const nextHasBefore = workOrder.files.some((f) => f.category === "PHOTO_BEFORE")
    if (nextFront) {
      if (!aggregate.frontImageUrl) {
        aggregate.frontImageUrl = nextFront
        aggregate.hasBeforeFront = nextHasBefore
      } else if (nextHasBefore) {
        aggregate.frontImageUrl = nextFront
        aggregate.hasBeforeFront = true
      } else if (!aggregate.hasBeforeFront) {
        aggregate.frontImageUrl = nextFront
      }
    }

    if (latestUpdateTime >= aggregate.latestUpdateTime) {
      aggregate.latestUpdateTime = latestUpdateTime
      aggregate.latestUpdateAt = workOrder.updatedAt.toISOString()
      aggregate.latestWorkOrder = {
        id: workOrder.id,
        workOrderNumber: workOrder.workOrderNumber ?? null,
        title: workOrder.title,
        status: workOrder.status,
      }
    }

    if (
      dueTime &&
      ACTIVE_STATUSES.has(workOrder.status) &&
      (aggregate.nextDueDateTime === null || dueTime < aggregate.nextDueDateTime)
    ) {
      aggregate.nextDueDateTime = dueTime
      aggregate.nextDueDate = workOrder.dueDate?.toISOString() ?? null
    }
  }

  return Array.from(grouped.values())
    .map((aggregate) => ({
      propertyKey: aggregate.propertyKey,
      addressLine1: aggregate.addressLine1,
      addressLine2: aggregate.addressLine2,
      city: aggregate.city,
      state: aggregate.state,
      postalCode: aggregate.postalCode,
      frontImageUrl: aggregate.frontImageUrl,
      totalWorkOrders: aggregate.totalWorkOrders,
      openWorkOrders: aggregate.openWorkOrders,
      completedWorkOrders: aggregate.completedWorkOrders,
      overdueWorkOrders: aggregate.overdueWorkOrders,
      invoiceReadyWorkOrders: aggregate.invoiceReadyWorkOrders,
      totalInvoices: aggregate.totalInvoices,
      totalPhotos: aggregate.totalPhotos,
      latestUpdateAt: aggregate.latestUpdateAt,
      nextDueDate: aggregate.nextDueDate,
      clients: [...aggregate.clientSet].slice(0, 3),
      contractors: [...aggregate.contractorSet].slice(0, 3),
      serviceTypes: [...aggregate.serviceSet].sort(),
      latestWorkOrder: aggregate.latestWorkOrder,
    }))
    .sort((a, b) => new Date(b.latestUpdateAt).getTime() - new Date(a.latestUpdateAt).getTime())
}

export async function getAdminPropertyDetail(propertyKey: string): Promise<PropertyDetailResponse | null> {
  const propertyIdentity = parsePropertyKey(propertyKey)
  if (!propertyIdentity) {
    return null
  }

  const workOrders = await db.workOrder.findMany({
    where: {
      AND: [
        { addressLine1: { equals: propertyIdentity.addressLine1, mode: "insensitive" } },
        { city: { equals: propertyIdentity.city, mode: "insensitive" } },
        { state: { equals: propertyIdentity.state, mode: "insensitive" } },
        { postalCode: { equals: propertyIdentity.postalCode, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      workOrderNumber: true,
      description: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      status: true,
      serviceType: true,
      dueDate: true,
      tasks: true,
      assignedDate: true,
      fieldComplete: true,
      lockCode: true,
      lockLocation: true,
      keyCode: true,
      gateCode: true,
      lotSize: true,
      gpsLat: true,
      gpsLon: true,
      updatedAt: true,
      createdAt: true,
      client: {
        select: {
          name: true,
          company: true,
        },
      },
      assignedContractor: {
        select: {
          name: true,
          company: true,
        },
      },
      assignedCoordinator: {
        select: {
          name: true,
        },
      },
      assignedProcessor: {
        select: {
          name: true,
        },
      },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          invoiceDate: true,
          sentToClientDate: true,
          completeDate: true,
          clientTotal: true,
        },
      },
      files: {
        where: {
          category: {
            in: [...PHOTO_CATEGORIES],
          },
        },
        select: {
          id: true,
          url: true,
          category: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      documentFiles: {
        where: {
          category: { in: ["DOCUMENT_PDF", "DOCUMENT_PCR", "OTHER"] },
        },
        select: {
          id: true,
          url: true,
          category: true,
          mimeType: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      messages: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      },
      threadedMessages: {
        select: {
          id: true,
          body: true,
          createdAt: true,
          messageType: true,
          createdByUser: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 25,
      },
      _count: {
        select: {
          files: true,
          messages: true,
          threadedMessages: true,
        },
      },
    },
    orderBy: [
      { createdAt: "desc" },
      { updatedAt: "desc" },
    ],
  })

  if (workOrders.length === 0) {
    return null
  }

  const latestUpdatedWorkOrder = [...workOrders].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0]

  const parsedTaskRows = workOrders.flatMap((workOrder) =>
    parseTasks(workOrder.tasks).map((task) => ({
      workOrderId: workOrder.id,
      contractorName:
        formatParticipantName(workOrder.assignedContractor?.company) ||
        formatParticipantName(workOrder.assignedContractor?.name) ||
        "Unassigned contractor",
      task,
    }))
  )

  const bidTasks = parsedTaskRows.filter((row) => getTaskType(row.task) === "bid")
  const completionTasks = parsedTaskRows.filter((row) => getTaskType(row.task) === "completion")
  const estimatedRevenue = parsedTaskRows.reduce((sum, row) => sum + getTaskTotal(row.task, "clientPrice"), 0)
  const estimatedContractorCost = parsedTaskRows.reduce(
    (sum, row) => sum + getTaskTotal(row.task, "contractorPrice"),
    0
  )
  const estimatedProfit = estimatedRevenue - estimatedContractorCost
  const estimatedMarginPercent = estimatedRevenue > 0 ? (estimatedProfit / estimatedRevenue) * 100 : 0

  const vendorMap = new Map<
    string,
    { name: string; activeWorkOrders: Set<string>; estimatedSpend: number; billedRevenue: number }
  >()

  workOrders.forEach((workOrder) => {
    const vendorName =
      formatParticipantName(workOrder.assignedContractor?.company) ||
      formatParticipantName(workOrder.assignedContractor?.name)
    if (!vendorName) return

    const current =
      vendorMap.get(vendorName) ?? {
        name: vendorName,
        activeWorkOrders: new Set<string>(),
        estimatedSpend: 0,
        billedRevenue: 0,
      }

    if (ACTIVE_STATUSES.has(workOrder.status)) {
      current.activeWorkOrders.add(workOrder.id)
    }
    current.billedRevenue += workOrder.invoice?.clientTotal ?? 0
    vendorMap.set(vendorName, current)
  })

  parsedTaskRows.forEach((row) => {
    const current =
      vendorMap.get(row.contractorName) ?? {
        name: row.contractorName,
        activeWorkOrders: new Set<string>(),
        estimatedSpend: 0,
        billedRevenue: 0,
      }
    current.estimatedSpend += getTaskTotal(row.task, "contractorPrice")
    current.activeWorkOrders.add(row.workOrderId)
    vendorMap.set(row.contractorName, current)
  })

  const gallery: PropertyGalleryItem[] = workOrders
    .flatMap((workOrder) =>
      workOrder.files.map((file) => ({
        id: file.id,
        url: file.url,
        category: file.category,
        createdAt: file.createdAt.toISOString(),
        workOrderId: workOrder.id,
        workOrderNumber: workOrder.workOrderNumber ?? null,
      }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const beforeHousePhoto = gallery.find((file) => file.category === "PHOTO_BEFORE")

  const documents: PropertyDocumentItem[] = workOrders
    .flatMap((workOrder) =>
      workOrder.documentFiles.map((file) => ({
        id: file.id,
        url: file.url,
        category: file.category,
        mimeType: file.mimeType,
        createdAt: file.createdAt.toISOString(),
        workOrderId: workOrder.id,
        workOrderNumber: workOrder.workOrderNumber ?? null,
      }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const notes: PropertyNoteItem[] = workOrders
    .flatMap((workOrder) => {
      const wn = workOrder.workOrderNumber ?? null
      return [
        ...workOrder.messages.map((message) => ({
          id: `legacy-${message.id}`,
          source: "legacy" as const,
          body: message.content,
          at: message.createdAt.toISOString(),
          workOrderId: workOrder.id,
          workOrderNumber: wn,
          author: message.author.name,
        })),
        ...workOrder.threadedMessages.map((message) => ({
          id: `thread-${message.id}`,
          source: "thread" as const,
          body: message.body,
          at: message.createdAt.toISOString(),
          workOrderId: workOrder.id,
          workOrderNumber: wn,
          author: message.createdByUser?.name || "System",
        })),
      ]
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 40)

  const timeline: PropertyTimelineEvent[] = workOrders
    .flatMap((workOrder) => {
      const workOrderLabel = workOrder.workOrderNumber ?? workOrder.title
      const events: PropertyTimelineEvent[] = [
        {
          id: `${workOrder.id}-created`,
          type: "WORK_ORDER",
          title: `Work order ${workOrderLabel} opened`,
          description: `${workOrder.serviceType.replaceAll("_", " ")} for ${workOrder.client.company || workOrder.client.name}.`,
          at: workOrder.createdAt.toISOString(),
          workOrderId: workOrder.id,
          workOrderNumber: workOrder.workOrderNumber ?? null,
        },
      ]

      if (workOrder.assignedDate) {
        events.push({
          id: `${workOrder.id}-assigned`,
          type: "ASSIGNMENT",
          title: `Assignment recorded on ${workOrderLabel}`,
          description:
            formatParticipantName(workOrder.assignedContractor?.company) ||
            formatParticipantName(workOrder.assignedContractor?.name) ||
            "Contractor assignment was recorded.",
          at: workOrder.assignedDate.toISOString(),
          workOrderId: workOrder.id,
          workOrderNumber: workOrder.workOrderNumber ?? null,
        })
      }

      if (workOrder.fieldComplete) {
        events.push({
          id: `${workOrder.id}-field-complete`,
          type: "FIELD_COMPLETE",
          title: `Field complete on ${workOrderLabel}`,
          description: "Field work was marked complete.",
          at: workOrder.fieldComplete.toISOString(),
          workOrderId: workOrder.id,
          workOrderNumber: workOrder.workOrderNumber ?? null,
        })
      }

      if (workOrder.invoice) {
        events.push({
          id: `${workOrder.id}-invoice-created`,
          type: "INVOICE",
          title: `Invoice ${workOrder.invoice.invoiceNumber} created`,
          description: `${workOrder.invoice.status} invoice for $${workOrder.invoice.clientTotal.toFixed(2)}.`,
          at: workOrder.invoice.invoiceDate.toISOString(),
          workOrderId: workOrder.id,
          workOrderNumber: workOrder.workOrderNumber ?? null,
        })

        if (workOrder.invoice.sentToClientDate) {
          events.push({
            id: `${workOrder.id}-invoice-sent`,
            type: "INVOICE",
            title: `Invoice ${workOrder.invoice.invoiceNumber} sent to client`,
            description: "Client billing package was sent.",
            at: workOrder.invoice.sentToClientDate.toISOString(),
            workOrderId: workOrder.id,
            workOrderNumber: workOrder.workOrderNumber ?? null,
          })
        }
      }

      workOrder.threadedMessages.forEach((message) => {
        events.push({
          id: `threaded-${message.id}`,
          type: "MESSAGE",
          title: `${message.createdByUser?.name || "System"} posted in ${workOrderLabel}`,
          description: message.body.slice(0, 160) || message.messageType.replaceAll("_", " "),
          at: message.createdAt.toISOString(),
          workOrderId: workOrder.id,
          workOrderNumber: workOrder.workOrderNumber ?? null,
        })
      })

      workOrder.messages.forEach((message) => {
        events.push({
          id: `legacy-${message.id}`,
          type: "MESSAGE",
          title: `${message.author.name} left a note on ${workOrderLabel}`,
          description: message.content.slice(0, 160),
          at: message.createdAt.toISOString(),
          workOrderId: workOrder.id,
          workOrderNumber: workOrder.workOrderNumber ?? null,
        })
      })

      return events
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 40)

  const workOrderRows: PropertyWorkOrderHistoryRow[] = workOrders.map((workOrder) => ({
    id: workOrder.id,
    workOrderNumber: workOrder.workOrderNumber ?? null,
    title: workOrder.title,
    status: workOrder.status,
    serviceType: workOrder.serviceType,
    dueDate: workOrder.dueDate?.toISOString() ?? null,
    fieldComplete: workOrder.fieldComplete?.toISOString() ?? null,
    updatedAt: workOrder.updatedAt.toISOString(),
    photoCount: workOrder._count.files,
    messageCount: workOrder._count.messages + workOrder._count.threadedMessages,
    clientName: workOrder.client.company || workOrder.client.name,
    contractorName:
      formatParticipantName(workOrder.assignedContractor?.company) ||
      formatParticipantName(workOrder.assignedContractor?.name),
    coordinatorName: formatParticipantName(workOrder.assignedCoordinator?.name),
    processorName: formatParticipantName(workOrder.assignedProcessor?.name),
    invoiceStatus: workOrder.invoice?.status ?? null,
    invoiceAmount: workOrder.invoice?.clientTotal ?? null,
  }))

  const inspectionWorkOrders = workOrders.filter((workOrder) => workOrder.serviceType === "INSPECTION")
  const inspectionPhotoCount = workOrders.reduce(
    (sum, workOrder) =>
      sum + workOrder.files.filter((file) => file.category === "PHOTO_INSPECTION").length,
    0
  )
  const beforeDuringAfterPhotoCount = workOrders.reduce(
    (sum, workOrder) =>
      sum +
      workOrder.files.filter((file) =>
        ["PHOTO_BEFORE", "PHOTO_DURING", "PHOTO_AFTER"].includes(file.category)
      ).length,
    0
  )
  const frontImageCoverage = workOrders.length > 0 ? (gallery.length > 0 ? 100 : 0) : 0
  const inspectionPhotoCoverage =
    inspectionWorkOrders.length > 0
      ? Math.min(100, Math.round((inspectionPhotoCount / inspectionWorkOrders.length) * 100))
      : inspectionPhotoCount > 0
        ? 100
        : 0
  const beforeDuringAfterCoverage =
    workOrders.length > 0 ? Math.min(100, Math.round((beforeDuringAfterPhotoCount / workOrders.length) * 100)) : 0
  const propertiesWithAccessCodes = Boolean(
    latestUpdatedWorkOrder.lockCode ||
      latestUpdatedWorkOrder.keyCode ||
      latestUpdatedWorkOrder.gateCode
  )
  const latestInspectionAt =
    inspectionWorkOrders
      .map((workOrder) => workOrder.updatedAt)
      .sort((a, b) => b.getTime() - a.getTime())[0]
      ?.toISOString() ?? null
  const openInspectionMessages = workOrders.reduce(
    (sum, workOrder) =>
      sum +
      workOrder.threadedMessages.filter(
        (message) =>
          message.messageType === "INSPECTION_UPDATE" ||
          message.body.toLowerCase().includes("inspection")
      ).length,
    0
  )
  const overdueComplianceItems =
    workOrders.filter((workOrder) => isOverdue(workOrder.status, workOrder.dueDate)).length +
    (propertiesWithAccessCodes ? 0 : 1) +
    (inspectionPhotoCoverage >= 100 ? 0 : 1)

  const complianceChecklist = [
    {
      id: "access",
      label: "Access & lock information",
      status: propertiesWithAccessCodes ? "COMPLETE" : "MISSING",
      detail: propertiesWithAccessCodes
        ? "Lock, key, or gate information is stored on the latest linked work order."
        : "No lock, key, or gate codes are stored for this property yet.",
    },
    {
      id: "gallery",
      label: "Front image & gallery coverage",
      status: gallery.length > 0 ? "COMPLETE" : "MISSING",
      detail: gallery.length > 0
        ? `${gallery.length} photo assets are linked to this property.`
        : "No property images are linked yet.",
    },
    {
      id: "inspection",
      label: "Inspection evidence",
      status:
        inspectionPhotoCoverage >= 100 ? "COMPLETE" : inspectionPhotoCoverage > 0 ? "PARTIAL" : "MISSING",
      detail:
        inspectionWorkOrders.length > 0
          ? `${inspectionPhotoCount} inspection photos across ${inspectionWorkOrders.length} inspection work orders.`
          : "No inspection work orders are linked to this property yet.",
    },
    {
      id: "completion",
      label: "Before / during / after coverage",
      status:
        beforeDuringAfterCoverage >= 100
          ? "COMPLETE"
          : beforeDuringAfterCoverage > 0
            ? "PARTIAL"
            : "MISSING",
      detail: `${beforeDuringAfterPhotoCount} completion-stage photos are recorded across linked work orders.`,
    },
    {
      id: "aging",
      label: "Overdue compliance watch",
      status: overdueComplianceItems > 0 ? "WARNING" : "COMPLETE",
      detail:
        overdueComplianceItems > 0
          ? `${overdueComplianceItems} open compliance risk item(s) need review.`
          : "No overdue compliance risks detected from the linked work orders.",
    },
  ] as const

  const summary = {
    totalWorkOrders: workOrders.length,
    openWorkOrders: workOrders.filter((workOrder) => ACTIVE_STATUSES.has(workOrder.status)).length,
    completedWorkOrders: workOrders.filter((workOrder) => COMPLETED_STATUSES.has(workOrder.status)).length,
    overdueWorkOrders: workOrders.filter((workOrder) => isOverdue(workOrder.status, workOrder.dueDate)).length,
    invoiceReadyWorkOrders: workOrders.filter(
      (workOrder) => workOrder.status === "OFFICE_APPROVED" || workOrder.invoice?.status === "DRAFT"
    ).length,
    totalInvoices: workOrders.filter((workOrder) => Boolean(workOrder.invoice)).length,
    totalInvoiceAmount: workOrders.reduce((sum, workOrder) => sum + (workOrder.invoice?.clientTotal ?? 0), 0),
    totalPhotos: workOrders.reduce((sum, workOrder) => sum + workOrder._count.files, 0),
  }

  const openCount = summary.openWorkOrders
  const closedOrCancelled = workOrders.filter(
    (workOrder) => workOrder.status === "CLOSED" || workOrder.status === "CANCELLED"
  ).length
  const inProgress = workOrders.filter((workOrder) =>
    ["IN_PROGRESS", "ASSIGNED", "READ"].includes(workOrder.status)
  ).length
  const hasOverdue = summary.overdueWorkOrders > 0
  let primaryLabel = "Active pipeline"
  if (workOrders.length > 0 && openCount === 0) {
    primaryLabel = "No open work — see history"
  }
  if (hasOverdue) {
    primaryLabel = "Overdue work — follow up"
  }
  const propertyStatus: PropertyStatusSummary = {
    openCount,
    closedOrCancelled,
    inProgress,
    hasOverdue,
    primaryLabel,
  }

  return {
    property: {
      propertyKey,
      addressLine1: latestUpdatedWorkOrder.addressLine1,
      addressLine2: latestUpdatedWorkOrder.addressLine2 ?? null,
      city: latestUpdatedWorkOrder.city,
      state: latestUpdatedWorkOrder.state,
      postalCode: latestUpdatedWorkOrder.postalCode,
      frontImageUrl: beforeHousePhoto?.url ?? gallery[0]?.url ?? null,
      latestUpdateAt: latestUpdatedWorkOrder.updatedAt.toISOString(),
      lockCode: latestUpdatedWorkOrder.lockCode ?? null,
      lockLocation: latestUpdatedWorkOrder.lockLocation ?? null,
      keyCode: latestUpdatedWorkOrder.keyCode ?? null,
      gateCode: latestUpdatedWorkOrder.gateCode ?? null,
      lotSize: latestUpdatedWorkOrder.lotSize ?? null,
      gpsLat: latestUpdatedWorkOrder.gpsLat ?? null,
      gpsLon: latestUpdatedWorkOrder.gpsLon ?? null,
    },
    summary,
    compliance: {
      inspectionWorkOrders: inspectionWorkOrders.length,
      propertiesWithAccessCodes,
      frontImageCoverage,
      inspectionPhotoCoverage,
      beforeDuringAfterCoverage,
      overdueComplianceItems,
      openInspectionMessages,
      latestInspectionAt,
      checklist: complianceChecklist.map((item) => ({ ...item })),
    },
    finance: {
      bidCount: bidTasks.length,
      completionCount: completionTasks.length,
      estimatedRevenue,
      estimatedContractorCost,
      estimatedProfit,
      estimatedMarginPercent,
      invoicedRevenue: summary.totalInvoiceAmount,
      averageInvoice: summary.totalInvoices > 0 ? summary.totalInvoiceAmount / summary.totalInvoices : 0,
      topVendors: Array.from(vendorMap.values())
        .map((vendor) => ({
          name: vendor.name,
          activeWorkOrders: vendor.activeWorkOrders.size,
          estimatedSpend: vendor.estimatedSpend,
          billedRevenue: vendor.billedRevenue,
        }))
        .sort((a, b) => b.estimatedSpend - a.estimatedSpend)
        .slice(0, 5),
    },
    gallery,
    documents,
    notes,
    propertyStatus,
    timeline,
    workOrders: workOrderRows,
  }
}
