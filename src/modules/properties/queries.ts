import "server-only"

import { db } from "@/lib/db"
import type {
  PropertyDetailResponse,
  PropertyGalleryItem,
  PropertyListItem,
  PropertyTimelineEvent,
  PropertyWorkOrderHistoryRow,
} from "@/modules/properties/types"

type PropertyIdentity = {
  addressLine1: string
  city: string
  state: string
  postalCode: string
}

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

function normalizePropertyPart(value: string | null | undefined) {
  return (value || "").trim().replace(/\s+/g, " ").toLowerCase()
}

function buildPropertyIdentityFromRecord(record: PropertyIdentity): PropertyIdentity {
  return {
    addressLine1: normalizePropertyPart(record.addressLine1),
    city: normalizePropertyPart(record.city),
    state: normalizePropertyPart(record.state),
    postalCode: normalizePropertyPart(record.postalCode),
  }
}

function buildPropertyKey(record: PropertyIdentity) {
  return Buffer.from(JSON.stringify(buildPropertyIdentityFromRecord(record)), "utf8").toString("base64url")
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
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
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
        frontImageUrl: workOrder.files[0]?.url ?? null,
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

    if (!aggregate.frontImageUrl && workOrder.files[0]?.url) {
      aggregate.frontImageUrl = workOrder.files[0].url
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
      assignedDate: true,
      fieldComplete: true,
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
        take: 5,
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
        take: 8,
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

  return {
    property: {
      propertyKey,
      addressLine1: latestUpdatedWorkOrder.addressLine1,
      addressLine2: latestUpdatedWorkOrder.addressLine2 ?? null,
      city: latestUpdatedWorkOrder.city,
      state: latestUpdatedWorkOrder.state,
      postalCode: latestUpdatedWorkOrder.postalCode,
      frontImageUrl: gallery[0]?.url ?? null,
      latestUpdateAt: latestUpdatedWorkOrder.updatedAt.toISOString(),
    },
    summary,
    gallery,
    timeline,
    workOrders: workOrderRows,
  }
}
