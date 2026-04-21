import "server-only"

import { db } from "@/lib/db"

type RawTask = Record<string, unknown>

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

function sumTaskTotal(tasks: RawTask[], key: "clientPrice" | "contractorPrice") {
  return tasks.reduce((sum, task) => sum + getTaskNumber(task, "qty") * getTaskNumber(task, key), 0)
}

function getVendorName(workOrder: {
  assignedContractor?: { name: string | null; company: string | null } | null
  contractorName?: string | null
}) {
  return (
    workOrder.assignedContractor?.company?.trim() ||
    workOrder.assignedContractor?.name?.trim() ||
    workOrder.contractorName?.trim() ||
    "Unassigned"
  )
}

export async function getAdminFinanceInsights() {
  const [invoices, workOrders] = await Promise.all([
    db.invoice.findMany({
      include: {
        workOrder: {
          include: {
            client: { select: { name: true, company: true } },
          },
        },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.workOrder.findMany({
      select: {
        id: true,
        status: true,
        tasks: true,
        assignedContractor: { select: { name: true, company: true } },
        contractorName: true,
        invoice: { select: { clientTotal: true, status: true } },
      },
    }),
  ])

  const parsedWorkOrders = workOrders.map((workOrder) => {
    const tasks = parseTasks(workOrder.tasks)
    const contractorSpend = sumTaskTotal(tasks, "contractorPrice")
    const estimatedRevenue = sumTaskTotal(tasks, "clientPrice")
    const chargeback = tasks.reduce((sum, task) => {
      const comments = String(task.comments || "").toLowerCase()
      return comments.includes("chargeback") ? sum + getTaskNumber(task, "qty") * getTaskNumber(task, "clientPrice") : sum
    }, 0)
    const materialCost = tasks.reduce((sum, task) => {
      const comments = String(task.comments || "").toLowerCase()
      const ratio =
        comments.includes("material") || comments.includes("lumber") || comments.includes("suppl") ? 0.42 : 0.22
      return sum + getTaskNumber(task, "qty") * getTaskNumber(task, "contractorPrice") * ratio
    }, 0)

    return {
      ...workOrder,
      tasks,
      contractorSpend,
      estimatedRevenue,
      estimatedProfit: estimatedRevenue - contractorSpend,
      chargeback,
      materialCost,
    }
  })

  const totalInvoicedRevenue = invoices.reduce((sum, invoice) => sum + (invoice.clientTotal || 0), 0)
  const totalEstimatedRevenue = parsedWorkOrders.reduce((sum, workOrder) => sum + workOrder.estimatedRevenue, 0)
  const totalContractorSpend = parsedWorkOrders.reduce((sum, workOrder) => sum + workOrder.contractorSpend, 0)
  const totalEstimatedProfit = parsedWorkOrders.reduce((sum, workOrder) => sum + workOrder.estimatedProfit, 0)
  const totalChargebacks = parsedWorkOrders.reduce((sum, workOrder) => sum + workOrder.chargeback, 0)
  const totalMaterialCost = parsedWorkOrders.reduce((sum, workOrder) => sum + workOrder.materialCost, 0)
  const totalPaid = invoices.filter((invoice) => invoice.status === "PAID").reduce((sum, invoice) => sum + (invoice.clientTotal || 0), 0)
  const totalPending = invoices.filter((invoice) => invoice.status === "SENT" || invoice.status === "DRAFT").reduce((sum, invoice) => sum + (invoice.clientTotal || 0), 0)

  const vendorMap = new Map<
    string,
    {
      name: string
      activeOrders: number
      estimatedSpend: number
      estimatedRevenue: number
      estimatedProfit: number
      materialCost: number
      chargebacks: number
      paidRevenue: number
    }
  >()

  parsedWorkOrders.forEach((workOrder) => {
    const vendorName = getVendorName(workOrder)
    const current =
      vendorMap.get(vendorName) ?? {
        name: vendorName,
        activeOrders: 0,
        estimatedSpend: 0,
        estimatedRevenue: 0,
        estimatedProfit: 0,
        materialCost: 0,
        chargebacks: 0,
        paidRevenue: 0,
      }

    if (["NEW", "UNASSIGNED", "IN_PROGRESS", "ASSIGNED", "READ", "FIELD_COMPLETE", "OFFICE_APPROVED", "SENT_TO_CLIENT"].includes(workOrder.status)) {
      current.activeOrders += 1
    }

    current.estimatedSpend += workOrder.contractorSpend
    current.estimatedRevenue += workOrder.estimatedRevenue
    current.estimatedProfit += workOrder.estimatedProfit
    current.materialCost += workOrder.materialCost
    current.chargebacks += workOrder.chargeback
    if (workOrder.invoice?.status === "PAID") {
      current.paidRevenue += workOrder.invoice.clientTotal || 0
    }

    vendorMap.set(vendorName, current)
  })

  const vendorEarnings = Array.from(vendorMap.values())
    .map((vendor) => ({
      ...vendor,
      marginPercent: vendor.estimatedRevenue > 0 ? (vendor.estimatedProfit / vendor.estimatedRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue)

  return {
    overview: {
      totalInvoicedRevenue,
      totalEstimatedRevenue,
      totalContractorSpend,
      totalEstimatedProfit,
      estimatedMarginPercent: totalEstimatedRevenue > 0 ? (totalEstimatedProfit / totalEstimatedRevenue) * 100 : 0,
      totalChargebacks,
      totalMaterialCost,
      totalPaid,
      totalPending,
      invoiceCount: invoices.length,
      averageInvoice: invoices.length > 0 ? totalInvoicedRevenue / invoices.length : 0,
    },
    vendorEarnings: vendorEarnings.slice(0, 12),
  }
}
