const { PrismaClient } = require("../src/generated/prisma")

const prisma = new PrismaClient()

const statusSequence = [
  "NEW",
  "UNASSIGNED",
  "IN_PROGRESS",
  "ASSIGNED",
  "READ",
  "FIELD_COMPLETE",
  "OFFICE_APPROVED",
  "SENT_TO_CLIENT",
  "CLOSED",
]

const historyLabels = [
  "Initial Intake",
  "Assignment Update",
  "Field Visit",
  "Office Review",
  "Client Delivery",
]

async function main() {
  const workOrders = await prisma.workOrder.findMany({
    where: {
      id: {
        not: {
          startsWith: "auto_history_",
        },
      },
    },
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" },
    ],
  })

  const photoPool = await prisma.fileAttachment.findMany({
    where: {
      url: {
        startsWith: "/uploads/",
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 60,
  })

  if (!workOrders.length) {
    console.log(JSON.stringify({ createdHistoryOrders: 0, createdPhotos: 0, reason: "No work orders found" }, null, 2))
    return
  }

  if (!photoPool.length) {
    throw new Error("No photo pool found. Expected existing file attachments to reuse as demo photo sources.")
  }

  const historyOrders = []
  const historyFiles = []

  workOrders.forEach((workOrder, index) => {
    const historyCount = (index % 5) + 1

    for (let j = 0; j < historyCount; j += 1) {
      const historyId = `auto_history_${workOrder.id}_${j + 1}`
      const status = statusSequence[(index + j) % statusSequence.length]
      const historyNumberBase = workOrder.workOrderNumber || `${850900 + index}`
      const workOrderNumber = `${historyNumberBase}-H${j + 1}`
      const createdAt = new Date(Date.UTC(2024, (index + j) % 12, 1 + ((index + j) % 25), 9, 0, 0))
      const dueDate = new Date(Date.UTC(2024, (index + j + 1) % 12, 5 + ((index + j) % 20), 0, 0, 0))
      const startDate = ["IN_PROGRESS", "ASSIGNED", "READ", "FIELD_COMPLETE", "OFFICE_APPROVED", "SENT_TO_CLIENT", "CLOSED"].includes(status)
        ? new Date(Date.UTC(2024, (index + j) % 12, 2 + ((index + j) % 20), 8, 0, 0))
        : null
      const fieldComplete = ["FIELD_COMPLETE", "OFFICE_APPROVED", "SENT_TO_CLIENT", "CLOSED"].includes(status)
        ? new Date(Date.UTC(2024, (index + j + 1) % 12, 10 + ((index + j) % 12), 0, 0, 0))
        : null

      historyOrders.push({
        id: historyId,
        title: `${workOrder.title || workOrder.workOrderNumber || "Work Order"} - ${historyLabels[j % historyLabels.length]}`,
        description: `History entry for ${workOrder.title || workOrder.workOrderNumber || "work order"} at ${workOrder.addressLine1 || "the property"}.`,
        addressLine1: workOrder.addressLine1 || "Unknown Address",
        addressLine2: workOrder.addressLine2 || null,
        city: workOrder.city || "Unknown City",
        state: workOrder.state || "MO",
        postalCode: workOrder.postalCode || "00000",
        serviceType: workOrder.serviceType || "OTHER",
        status,
        dueDate,
        tasks: JSON.stringify([
          {
            id: `${historyId}_task_1`,
            taskType: "Completion",
            taskName: historyLabels[j % historyLabels.length],
            qty: 1,
            contractorPrice: 45 + (j * 10),
            clientPrice: 80 + (j * 15),
            comments: `Historical activity snapshot for ${workOrder.addressLine1 || "the property"}.`,
            photoRequirements: [],
          },
        ]),
        workOrderNumber,
        coordinator: workOrder.coordinator || null,
        processor: workOrder.processor || null,
        startDate,
        fieldComplete,
        contractorName: workOrder.contractorName || null,
        contractorEmail: workOrder.contractorEmail || null,
        contractorPhone: workOrder.contractorPhone || null,
        createdAt,
        updatedAt: new Date(Date.UTC(2026, 2, 21)),
        clientId: workOrder.clientId,
        creatorId: workOrder.creatorId,
        assignedContractorId: workOrder.assignedContractorId || null,
        assignedCoordinatorId: workOrder.assignedCoordinatorId || null,
        assignedProcessorId: workOrder.assignedProcessorId || null,
      })

      ;["PHOTO_BEFORE", "PHOTO_DURING", "PHOTO_AFTER"].forEach((category, photoIndex) => {
        const sample = photoPool[(index * 7 + j * 3 + photoIndex) % photoPool.length]
        historyFiles.push({
          id: `${historyId}_${category.toLowerCase()}`,
          url: sample.url,
          key: `${historyId}/${category.toLowerCase()}_${photoIndex + 1}`,
          mimeType: sample.mimeType || "image/jpeg",
          category,
          createdAt,
          workOrderId: historyId,
          requirementId: null,
          taskId: null,
        })
      })
    }
  })

  const existingHistoryOrderIds = new Set(
    (
      await prisma.workOrder.findMany({
        where: {
          id: {
            in: historyOrders.map((order) => order.id),
          },
        },
        select: {
          id: true,
        },
      })
    ).map((order) => order.id)
  )

  const existingHistoryFileIds = new Set(
    (
      await prisma.fileAttachment.findMany({
        where: {
          id: {
            in: historyFiles.map((file) => file.id),
          },
        },
        select: {
          id: true,
        },
      })
    ).map((file) => file.id)
  )

  const newHistoryOrders = historyOrders.filter((order) => !existingHistoryOrderIds.has(order.id))
  const newHistoryFiles = historyFiles.filter((file) => !existingHistoryFileIds.has(file.id))

  if (newHistoryOrders.length) {
    await prisma.workOrder.createMany({
      data: newHistoryOrders,
    })
  }

  if (newHistoryFiles.length) {
    await prisma.fileAttachment.createMany({
      data: newHistoryFiles,
    })
  }

  const totalAutoHistoryOrders = await prisma.workOrder.count({
    where: {
      id: {
        startsWith: "auto_history_",
      },
    },
  })

  const totalAutoHistoryPhotos = await prisma.fileAttachment.count({
    where: {
      workOrderId: {
        startsWith: "auto_history_",
      },
    },
  })

  console.log(
    JSON.stringify(
      {
        createdHistoryOrders: newHistoryOrders.length,
        createdPhotos: newHistoryFiles.length,
        totalAutoHistoryOrders,
        totalAutoHistoryPhotos,
      },
      null,
      2
    )
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
