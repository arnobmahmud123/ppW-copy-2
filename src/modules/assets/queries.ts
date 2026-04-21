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

function classifyAsset(taskTitle: string) {
  const title = taskTitle.toLowerCase()
  if (title.includes("appliance")) return "Appliance"
  if (title.includes("door")) return "Door"
  if (title.includes("window")) return "Window"
  if (title.includes("lockbox") || title.includes("lock")) return "Access"
  if (title.includes("roof")) return "Roof"
  if (title.includes("fence")) return "Fence"
  if (title.includes("grass") || title.includes("shrub") || title.includes("tree")) return "Exterior"
  if (title.includes("cabinet") || title.includes("vanity") || title.includes("toilet")) return "Interior Fixture"
  return "General"
}

function looksLikeSupply(task: RawTask) {
  const title = String(task.title || task.item || "").toLowerCase()
  const comments = String(task.comments || "").toLowerCase()
  return (
    title.includes("material") ||
    title.includes("lumber") ||
    title.includes("detector") ||
    title.includes("lockbox") ||
    title.includes("tarp") ||
    comments.includes("delivery") ||
    comments.includes("supply")
  )
}

export async function getAdminAssetLogisticsInsights() {
  const workOrders = await db.workOrder.findMany({
    select: {
      id: true,
      title: true,
      workOrderNumber: true,
      addressLine1: true,
      city: true,
      state: true,
      status: true,
      serviceType: true,
      dueDate: true,
      tasks: true,
      files: {
        select: {
          id: true,
          category: true,
          url: true,
          createdAt: true,
        },
      },
      assignedContractor: { select: { name: true, company: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 250,
  })

  const assetMap = new Map<string, { type: string; count: number }>()
  const logisticsRows: Array<{
    workOrderId: string
    workOrderNumber: string
    property: string
    serviceType: string
    contractor: string
    dueDate: string | null
    deliverySignals: string[]
  }> = []

  const propertyRows = workOrders.map((workOrder) => {
    const tasks = parseTasks(workOrder.tasks)
    const frontImage =
      workOrder.files.find((file) => file.category === "PHOTO_BEFORE") ||
      workOrder.files[0] ||
      null

    const assetTypes = tasks.map((task) =>
      classifyAsset(String(task.title || task.item || "General task"))
    )
    assetTypes.forEach((assetType) => {
      const current = assetMap.get(assetType) ?? { type: assetType, count: 0 }
      current.count += 1
      assetMap.set(assetType, current)
    })

    const deliverySignals = tasks
      .filter(looksLikeSupply)
      .slice(0, 4)
      .map((task) => String(task.title || task.item || "Supply item"))

    if (deliverySignals.length > 0) {
      logisticsRows.push({
        workOrderId: workOrder.id,
        workOrderNumber: workOrder.workOrderNumber || workOrder.title,
        property: `${workOrder.addressLine1}, ${workOrder.city}, ${workOrder.state}`,
        serviceType: workOrder.serviceType,
        contractor:
          workOrder.assignedContractor?.company ||
          workOrder.assignedContractor?.name ||
          "Unassigned",
        dueDate: workOrder.dueDate?.toISOString() ?? null,
        deliverySignals,
      })
    }

    return {
      id: workOrder.id,
      workOrderNumber: workOrder.workOrderNumber || workOrder.title,
      property: `${workOrder.addressLine1}, ${workOrder.city}, ${workOrder.state}`,
      serviceType: workOrder.serviceType,
      status: workOrder.status,
      assetCount: assetTypes.length,
      inspectionPhotoCount: workOrder.files.filter((file) => file.category === "PHOTO_INSPECTION").length,
      imageUrl: frontImage?.url ?? null,
      logisticsFlags: deliverySignals,
    }
  })

  return {
    overview: {
      trackedProperties: propertyRows.length,
      assetFamilies: assetMap.size,
      logisticsWatchItems: logisticsRows.length,
      inspectionReadyProperties: propertyRows.filter((row) => row.inspectionPhotoCount > 0).length,
    },
    topAssetFamilies: Array.from(assetMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    propertyRows: propertyRows.slice(0, 24),
    logisticsRows: logisticsRows
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
      .slice(0, 20),
  }
}
