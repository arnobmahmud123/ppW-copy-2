import "server-only"

import { db } from "@/lib/db"

import type {
  ContractorMatrixItem,
  ContractorMatrixSummary,
  CoordinatorConsoleItem,
  CoordinatorConsoleSummary,
  WorkforceRecentWorkOrder,
} from "@/modules/workforce/types"

const OPEN_STATUSES = new Set([
  "NEW",
  "UNASSIGNED",
  "ASSIGNED",
  "IN_PROGRESS",
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

const QUALITY_ELIGIBLE_STATUSES = new Set([
  "FIELD_COMPLETE",
  "OFFICE_APPROVED",
  "SENT_TO_CLIENT",
  "CLOSED",
  "COMPLETED",
])

const QUALITY_PASS_STATUSES = new Set([
  "OFFICE_APPROVED",
  "SENT_TO_CLIENT",
  "CLOSED",
  "COMPLETED",
])

function normalizeLocation(value: string | null | undefined) {
  return (value || "").trim().replace(/\s+/g, " ").toLowerCase()
}

function buildPropertyKey(input: {
  addressLine1: string
  city: string
  state: string
  postalCode: string
}) {
  return [
    normalizeLocation(input.addressLine1),
    normalizeLocation(input.city),
    normalizeLocation(input.state),
    normalizeLocation(input.postalCode),
  ].join("::")
}

function isOverdue(status: string, dueDate: Date | null) {
  if (!dueDate || !OPEN_STATUSES.has(status)) return false
  return dueDate.getTime() < Date.now()
}

function isDueThisWeek(status: string, dueDate: Date | null) {
  if (!dueDate || !OPEN_STATUSES.has(status)) return false
  const now = Date.now()
  const diff = dueDate.getTime() - now
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
}

function getCompletionTimestamp(input: { status: string; fieldComplete: Date | null; updatedAt: Date }) {
  if (input.fieldComplete) return input.fieldComplete
  if (COMPLETED_STATUSES.has(input.status)) return input.updatedAt
  return null
}

function roundWhole(value: number) {
  return Math.round(value)
}

function toRecentWorkOrders<
  T extends {
    id: string
    workOrderNumber: string | null
    title: string
    status: string
    dueDate: Date | null
    addressLine1: string
    city: string
    state: string
    serviceType: string
  },
>(
  workOrders: T[],
  assignedContractorNameMap?: Map<string, string | null>
): WorkforceRecentWorkOrder[] {
  return workOrders.slice(0, 5).map((workOrder) => ({
    id: workOrder.id,
    workOrderNumber: workOrder.workOrderNumber,
    title: workOrder.title,
    status: workOrder.status,
    dueDate: workOrder.dueDate?.toISOString() ?? null,
    addressLine1: workOrder.addressLine1,
    city: workOrder.city,
    state: workOrder.state,
    serviceType: workOrder.serviceType,
    assignedContractorName: assignedContractorNameMap?.get(workOrder.id) ?? null,
  }))
}

export async function getCoordinatorConsoleData(): Promise<{
  summary: CoordinatorConsoleSummary
  coordinators: CoordinatorConsoleItem[]
}> {
  const coordinators = await db.user.findMany({
    where: {
      role: "COORDINATOR",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      company: true,
      avatarUrl: true,
      workOrdersAsCoordinator: {
        select: {
          id: true,
          workOrderNumber: true,
          title: true,
          status: true,
          serviceType: true,
          dueDate: true,
          fieldComplete: true,
          updatedAt: true,
          addressLine1: true,
          city: true,
          state: true,
          postalCode: true,
          assignedContractorId: true,
          assignedContractor: {
            select: {
              name: true,
              company: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  })

  const items = coordinators.map((coordinator) => {
    const propertyKeys = new Set<string>()
    const contractorIds = new Set<string>()
    const serviceTypes = new Set<string>()

    let openWorkOrders = 0
    let overdueWorkOrders = 0
    let fieldCompleteQueue = 0
    let officeApprovedQueue = 0
    let sentToClientCount = 0
    let dueThisWeek = 0

    const contractorNameMap = new Map<string, string | null>()

    coordinator.workOrdersAsCoordinator.forEach((workOrder) => {
      propertyKeys.add(buildPropertyKey(workOrder))
      serviceTypes.add(workOrder.serviceType)

      if (workOrder.assignedContractorId) {
        contractorIds.add(workOrder.assignedContractorId)
      }

      contractorNameMap.set(
        workOrder.id,
        workOrder.assignedContractor?.company || workOrder.assignedContractor?.name || null
      )

      if (OPEN_STATUSES.has(workOrder.status)) openWorkOrders += 1
      if (isOverdue(workOrder.status, workOrder.dueDate)) overdueWorkOrders += 1
      if (workOrder.status === "FIELD_COMPLETE") fieldCompleteQueue += 1
      if (workOrder.status === "OFFICE_APPROVED") officeApprovedQueue += 1
      if (workOrder.status === "SENT_TO_CLIENT") sentToClientCount += 1
      if (isDueThisWeek(workOrder.status, workOrder.dueDate)) dueThisWeek += 1
    })

    return {
      id: coordinator.id,
      name: coordinator.name,
      email: coordinator.email,
      phone: coordinator.phone ?? null,
      company: coordinator.company ?? null,
      avatarUrl: coordinator.avatarUrl ?? null,
      totalAssignedWorkOrders: coordinator.workOrdersAsCoordinator.length,
      openWorkOrders,
      overdueWorkOrders,
      fieldCompleteQueue,
      officeApprovedQueue,
      sentToClientCount,
      dueThisWeek,
      propertiesCount: propertyKeys.size,
      contractorTouches: contractorIds.size,
      serviceTypes: [...serviceTypes].sort(),
      latestActivityAt: coordinator.workOrdersAsCoordinator[0]?.updatedAt.toISOString() ?? null,
      recentWorkOrders: toRecentWorkOrders(coordinator.workOrdersAsCoordinator, contractorNameMap),
    }
  })

  const summary = items.reduce<CoordinatorConsoleSummary>(
    (acc, coordinator) => {
      acc.totalCoordinators += 1
      acc.totalOpenWorkOrders += coordinator.openWorkOrders
      acc.totalOverdueWorkOrders += coordinator.overdueWorkOrders
      acc.totalInvoiceReadyWorkOrders += coordinator.officeApprovedQueue
      if (coordinator.openWorkOrders > 0) {
        acc.activeCoordinators += 1
      }
      return acc
    },
    {
      totalCoordinators: 0,
      activeCoordinators: 0,
      totalOpenWorkOrders: 0,
      totalOverdueWorkOrders: 0,
      totalInvoiceReadyWorkOrders: 0,
    }
  )

  return { summary, coordinators: items }
}

export async function getContractorIntelligenceData(): Promise<{
  summary: ContractorMatrixSummary
  contractors: ContractorMatrixItem[]
}> {
  const contractors = await db.user.findMany({
    where: {
      role: "CONTRACTOR",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      company: true,
      address: true,
      avatarUrl: true,
      createdAt: true,
      workOrdersAssigned: {
        select: {
          id: true,
          workOrderNumber: true,
          title: true,
          status: true,
          serviceType: true,
          dueDate: true,
          fieldComplete: true,
          updatedAt: true,
          addressLine1: true,
          city: true,
          state: true,
          postalCode: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  })

  const items = contractors.map((contractor) => {
    const states = new Set<string>()
    const cities = new Set<string>()
    const serviceTypeCounts = new Map<string, number>()

    let activeOrders = 0
    let completedOrders = 0
    let overdueOrders = 0
    let fieldCompleteQueue = 0
    let officeApprovedQueue = 0
    let sentToClientCount = 0
    let qualityEligible = 0
    let qualityPassed = 0
    let completedWithDeadline = 0
    let completedOnTime = 0

    contractor.workOrdersAssigned.forEach((workOrder) => {
      states.add(workOrder.state)
      cities.add(workOrder.city)
      serviceTypeCounts.set(workOrder.serviceType, (serviceTypeCounts.get(workOrder.serviceType) || 0) + 1)

      if (OPEN_STATUSES.has(workOrder.status)) activeOrders += 1
      if (COMPLETED_STATUSES.has(workOrder.status)) completedOrders += 1
      if (isOverdue(workOrder.status, workOrder.dueDate)) overdueOrders += 1
      if (workOrder.status === "FIELD_COMPLETE") fieldCompleteQueue += 1
      if (workOrder.status === "OFFICE_APPROVED") officeApprovedQueue += 1
      if (workOrder.status === "SENT_TO_CLIENT") sentToClientCount += 1

      if (QUALITY_ELIGIBLE_STATUSES.has(workOrder.status)) {
        qualityEligible += 1
      }

      if (QUALITY_PASS_STATUSES.has(workOrder.status)) {
        qualityPassed += 1
      }

      const completionDate = getCompletionTimestamp(workOrder)
      if (completionDate) {
        completedWithDeadline += 1
        if (!workOrder.dueDate || completionDate.getTime() <= workOrder.dueDate.getTime()) {
          completedOnTime += 1
        }
      }
    })

    const efficiencyScore = completedWithDeadline > 0 ? roundWhole((completedOnTime / completedWithDeadline) * 100) : 0
    const accuracyScore = qualityEligible > 0 ? roundWhole((qualityPassed / qualityEligible) * 100) : 0
    const capacityUsage = Math.min(100, roundWhole((activeOrders / 12) * 100))
    const ratingBase = contractor.workOrdersAssigned.length > 0 ? (efficiencyScore + accuracyScore) / 2 : null
    const rating = ratingBase === null ? null : Number((2.5 + (ratingBase / 100) * 2.5).toFixed(1))

    const capacityLabel =
      capacityUsage >= 100 ? "Overloaded" :
      capacityUsage >= 80 ? "Near capacity" :
      capacityUsage >= 45 ? "Balanced" :
      "Light"

    const serviceTypes = [...serviceTypeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([serviceType]) => serviceType)

    return {
      id: contractor.id,
      name: contractor.name,
      email: contractor.email,
      phone: contractor.phone ?? null,
      company: contractor.company ?? null,
      address: contractor.address ?? null,
      avatarUrl: contractor.avatarUrl ?? null,
      createdAt: contractor.createdAt.toISOString(),
      activeOrders,
      totalAssignedOrders: contractor.workOrdersAssigned.length,
      completedOrders,
      overdueOrders,
      fieldCompleteQueue,
      officeApprovedQueue,
      sentToClientCount,
      statesCovered: [...states].sort(),
      citiesCovered: [...cities].sort(),
      serviceTypes,
      efficiencyScore,
      accuracyScore,
      capacityUsage,
      capacityLabel,
      rating,
      recentWorkOrders: toRecentWorkOrders(contractor.workOrdersAssigned),
    }
  })

  const contractorsWithOrders = items.filter((contractor) => contractor.totalAssignedOrders > 0)
  const summary: ContractorMatrixSummary = {
    totalContractors: items.length,
    activeContractors: items.filter((contractor) => contractor.activeOrders > 0).length,
    totalActiveOrders: items.reduce((sum, contractor) => sum + contractor.activeOrders, 0),
    averageEfficiencyScore:
      contractorsWithOrders.length > 0
        ? roundWhole(
            contractorsWithOrders.reduce((sum, contractor) => sum + contractor.efficiencyScore, 0) /
              contractorsWithOrders.length
          )
        : 0,
    averageAccuracyScore:
      contractorsWithOrders.length > 0
        ? roundWhole(
            contractorsWithOrders.reduce((sum, contractor) => sum + contractor.accuracyScore, 0) /
              contractorsWithOrders.length
          )
        : 0,
  }

  return { summary, contractors: items }
}
