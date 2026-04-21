import "server-only"

import { db } from "@/lib/db"

type DispatchRecommendation = {
  contractorId: string
  contractorName: string
  company: string | null
  phone: string | null
  email: string
  score: number
  serviceMatchCount: number
  locationMatchCount: number
  activeOrders: number
  completedOrders: number
  onTimeRate: number
  rationale: string[]
}

function formatServiceType(serviceType: string) {
  return serviceType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function normalizeNumber(value: number) {
  return Number.isFinite(value) ? value : 0
}

export async function getDispatchRecommendations() {
  const [contractors, workOrders] = await Promise.all([
    db.user.findMany({
      where: { role: "CONTRACTOR" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        workOrdersAssigned: {
          select: {
            id: true,
            serviceType: true,
            city: true,
            state: true,
            status: true,
            dueDate: true,
            fieldComplete: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.workOrder.findMany({
      where: {
        OR: [
          { assignedContractorId: null },
          { status: "UNASSIGNED" },
          { status: "NEW" },
          { status: "READ" },
        ],
      },
      select: {
        id: true,
        title: true,
        workOrderNumber: true,
        serviceType: true,
        city: true,
        state: true,
        dueDate: true,
        status: true,
        client: { select: { name: true, company: true } },
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 12,
    }),
  ])

  const contractorCards = contractors.map((contractor) => {
    const assignedOrders = contractor.workOrdersAssigned
    const activeOrders = assignedOrders.filter((workOrder) =>
      ["NEW", "UNASSIGNED", "IN_PROGRESS", "ASSIGNED", "READ", "FIELD_COMPLETE", "OFFICE_APPROVED", "SENT_TO_CLIENT"].includes(workOrder.status)
    )
    const completedOrders = assignedOrders.filter((workOrder) =>
      ["COMPLETED", "FIELD_COMPLETE", "OFFICE_APPROVED", "CLOSED"].includes(workOrder.status)
    )
    const onTimeCompletedOrders = completedOrders.filter((workOrder) => {
      if (!workOrder.dueDate || !workOrder.fieldComplete) return false
      return workOrder.fieldComplete.getTime() <= workOrder.dueDate.getTime()
    })

    return {
      id: contractor.id,
      name: contractor.name,
      email: contractor.email,
      phone: contractor.phone,
      company: contractor.company,
      assignedOrders,
      activeOrders: activeOrders.length,
      completedOrders: completedOrders.length,
      onTimeRate:
        completedOrders.length > 0
          ? (onTimeCompletedOrders.length / completedOrders.length) * 100
          : 0,
    }
  })

  const dispatchQueue = workOrders.map((workOrder) => {
    const recommendations: DispatchRecommendation[] = contractorCards
      .map((contractor) => {
        const serviceMatchCount = contractor.assignedOrders.filter(
          (assignedOrder) => assignedOrder.serviceType === workOrder.serviceType
        ).length
        const stateMatchCount = contractor.assignedOrders.filter(
          (assignedOrder) => assignedOrder.state === workOrder.state
        ).length
        const cityMatchCount = contractor.assignedOrders.filter(
          (assignedOrder) =>
            assignedOrder.state === workOrder.state && assignedOrder.city === workOrder.city
        ).length

        const score =
          serviceMatchCount * 24 +
          cityMatchCount * 18 +
          stateMatchCount * 10 +
          contractor.completedOrders * 0.8 +
          contractor.onTimeRate * 0.45 -
          contractor.activeOrders * 8

        const rationale = [
          `${serviceMatchCount} prior ${formatServiceType(workOrder.serviceType)} jobs`,
          cityMatchCount > 0
            ? `${cityMatchCount} jobs in ${workOrder.city}, ${workOrder.state}`
            : `${stateMatchCount} jobs in ${workOrder.state}`,
          `${contractor.activeOrders} active orders`,
          `${contractor.onTimeRate.toFixed(0)}% on-time completion`,
        ]

        return {
          contractorId: contractor.id,
          contractorName: contractor.name,
          company: contractor.company,
          phone: contractor.phone,
          email: contractor.email,
          score: normalizeNumber(score),
          serviceMatchCount,
          locationMatchCount: cityMatchCount || stateMatchCount,
          activeOrders: contractor.activeOrders,
          completedOrders: contractor.completedOrders,
          onTimeRate: contractor.onTimeRate,
          rationale,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    return {
      workOrderId: workOrder.id,
      workOrderNumber: workOrder.workOrderNumber || workOrder.title,
      title: workOrder.title,
      serviceType: workOrder.serviceType,
      city: workOrder.city,
      state: workOrder.state,
      dueDate: workOrder.dueDate?.toISOString() ?? null,
      status: workOrder.status,
      clientName: workOrder.client.company || workOrder.client.name,
      recommendations,
    }
  })

  const topContractors = contractorCards
    .map((contractor) => ({
      id: contractor.id,
      name: contractor.name,
      company: contractor.company,
      email: contractor.email,
      phone: contractor.phone,
      activeOrders: contractor.activeOrders,
      completedOrders: contractor.completedOrders,
      onTimeRate: contractor.onTimeRate,
      capacityScore: Math.max(0, 100 - contractor.activeOrders * 9),
    }))
    .sort((a, b) => b.onTimeRate - a.onTimeRate || a.activeOrders - b.activeOrders)
    .slice(0, 8)

  return {
    dispatchQueue,
    topContractors,
    overview: {
      queuedWorkOrders: dispatchQueue.length,
      availableContractors: contractorCards.filter((contractor) => contractor.activeOrders < 6).length,
      averageOnTimeRate:
        contractorCards.length > 0
          ? contractorCards.reduce((sum, contractor) => sum + contractor.onTimeRate, 0) /
            contractorCards.length
          : 0,
    },
  }
}

function classifyEmailByHeuristic(content: string, subject: string) {
  const haystack = `${subject}\n${content}`.toLowerCase()
  if (haystack.includes("invoice") || haystack.includes("payment") || haystack.includes("remittance")) {
    return "INVOICE"
  }
  if (haystack.includes("complaint") || haystack.includes("issue") || haystack.includes("escalation")) {
    return "COMPLAINT"
  }
  if (haystack.includes("inspection") || haystack.includes("winterization") || haystack.includes("grass") || haystack.includes("board up")) {
    return "WORK_ORDER_REQUEST"
  }
  return "GENERAL_REQUEST"
}

export async function getEmailBusinessIntelligence() {
  const [supportTickets, invoices, workOrders, notifications] = await Promise.all([
    db.supportTicket.findMany({
      select: { id: true, status: true, priority: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 250,
    }),
    db.invoice.findMany({
      select: { id: true, status: true, clientTotal: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 250,
    }),
    db.workOrder.findMany({
      select: { id: true, status: true, serviceType: true, dueDate: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 250,
    }),
    db.notification.findMany({
      select: { id: true, title: true, body: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ])

  const overdueWorkOrders = workOrders.filter(
    (workOrder) =>
      workOrder.dueDate &&
      workOrder.dueDate.getTime() < Date.now() &&
      !["COMPLETED", "FIELD_COMPLETE", "OFFICE_APPROVED", "CLOSED", "CANCELLED"].includes(workOrder.status)
  ).length

  const latestOperationalSignals = notifications.slice(0, 8).map((notification) => ({
    id: notification.id,
    title: notification.title,
    body: notification.body,
    createdAt: notification.createdAt.toISOString(),
  }))

  return {
    ticketVolume: supportTickets.length,
    urgentTickets: supportTickets.filter((ticket) => ticket.priority === "URGENT").length,
    openTickets: supportTickets.filter((ticket) => ticket.status !== "CLOSED").length,
    invoiceVolume: invoices.length,
    openInvoiceValue: invoices
      .filter((invoice) => invoice.status === "SENT" || invoice.status === "DRAFT")
      .reduce((sum, invoice) => sum + (invoice.clientTotal || 0), 0),
    overdueWorkOrders,
    latestOperationalSignals,
  }
}

export async function parseEmailIntelligence(input: {
  subject?: string
  from?: string
  content: string
}) {
  const subject = (input.subject || "").trim()
  const content = input.content.trim()
  const from = (input.from || "").trim()

  const classification = classifyEmailByHeuristic(content, subject)
  const workOrderMatches = Array.from(
    new Set(content.match(/\bWO-\d{3,}\b/gi) || [])
  ).slice(0, 5)
  const phoneMatches = Array.from(new Set(content.match(/\+?\d[\d\s().-]{8,}\d/g) || [])).slice(0, 5)
  const addressHintMatch = content.match(/\d{1,6}\s+[A-Za-z0-9.\- ]+,\s*[A-Za-z.\- ]+,\s*[A-Z]{2}/)

  const actionItems: string[] = []
  if (classification === "INVOICE") {
    actionItems.push("Route this email to billing review and match it with the open invoice queue.")
  }
  if (classification === "COMPLAINT") {
    actionItems.push("Escalate to coordinator/admin review and attach it to the property communication timeline.")
  }
  if (classification === "WORK_ORDER_REQUEST") {
    actionItems.push("Create or update the linked work order and notify the assigned coordinator.")
  }
  if (workOrderMatches.length === 0) {
    actionItems.push("No explicit work order number found. Confirm property or WO reference before operational follow-up.")
  }
  if (phoneMatches.length > 0) {
    actionItems.push("Phone contact detected. This can be used for AI follow-up calling automation.")
  }

  return {
    classification,
    confidence: classification === "GENERAL_REQUEST" ? 0.62 : 0.84,
    from,
    subject,
    extracted: {
      workOrders: workOrderMatches,
      phoneNumbers: phoneMatches,
      propertyHint: addressHintMatch?.[0] ?? null,
    },
    summary:
      classification === "INVOICE"
        ? "This reads like a billing or payment-related email and should land with accounting first."
        : classification === "COMPLAINT"
          ? "This looks like a service issue or complaint and should be escalated into the operations response flow."
          : classification === "WORK_ORDER_REQUEST"
            ? "This appears to contain field-service or property-preservation work instructions that should feed the work order workflow."
            : "This appears to be a general request that still needs work-order or property context before routing.",
    actionItems,
  }
}
