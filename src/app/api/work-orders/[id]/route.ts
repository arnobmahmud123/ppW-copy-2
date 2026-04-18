import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

const validWorkOrderStatuses = [
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
] as const

function buildPropertyMatch(whereSource: {
  addressLine1: string
  city: string
  state: string
  postalCode: string
}) {
  return {
    addressLine1: whereSource.addressLine1,
    city: whereSource.city,
    state: whereSource.state,
    postalCode: whereSource.postalCode,
  }
}

function buildPropertyUpdateData(body: Record<string, unknown>, existingWorkOrder: any) {
  const parseOptionalFloat = (value: unknown) => {
    if (value === null || value === undefined || value === "") return null
    const num = Number(value)
    return Number.isFinite(num) ? num : null
  }

  return {
    addressLine1:
      typeof body.addressLine1 === "string" ? body.addressLine1 : existingWorkOrder.addressLine1,
    addressLine2:
      typeof body.addressLine2 === "string" ? body.addressLine2 : existingWorkOrder.addressLine2,
    city: typeof body.city === "string" ? body.city : existingWorkOrder.city,
    state: typeof body.state === "string" ? body.state : existingWorkOrder.state,
    postalCode:
      typeof body.postalCode === "string" ? body.postalCode : existingWorkOrder.postalCode,
    lockCode:
      typeof body.lockCode === "string" ? body.lockCode : existingWorkOrder.lockCode,
    lockLocation:
      typeof body.lockLocation === "string" ? body.lockLocation : existingWorkOrder.lockLocation,
    keyCode: typeof body.keyCode === "string" ? body.keyCode : existingWorkOrder.keyCode,
    gateCode: typeof body.gateCode === "string" ? body.gateCode : existingWorkOrder.gateCode,
    lotSize: typeof body.lotSize === "string" ? body.lotSize : existingWorkOrder.lotSize,
    gpsLat: body.gpsLat !== undefined ? parseOptionalFloat(body.gpsLat) : existingWorkOrder.gpsLat,
    gpsLon: body.gpsLon !== undefined ? parseOptionalFloat(body.gpsLon) : existingWorkOrder.gpsLon,
    updatedAt: new Date(),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    console.log("GET /api/work-orders/[id] - Session:", session)
    
    if (!session?.user) {
      console.log("GET /api/work-orders/[id] - No session, returning 401")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: workOrderId } = await params
    console.log("GET /api/work-orders/[id] - Work Order ID:", workOrderId)

    // Build where clause based on user role
    let whereClause: any = { id: workOrderId }

    if (session.user.role === "CLIENT") {
      whereClause.clientId = session.user.id
    } else if (session.user.role === "CONTRACTOR") {
      whereClause.assignedContractorId = session.user.id
    } else if (session.user.role === "ADMIN") {
      // Admin can access all work orders - no additional restrictions
    } else {
      // For other roles, check if they are assigned to this work order
      whereClause.OR = [
        { assignedContractorId: session.user.id },
        { assignedCoordinatorId: session.user.id },
        { assignedProcessorId: session.user.id }
      ]
    }

    const workOrder = await prisma.workOrder.findFirst({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          }
        },
        assignedContractor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        messages: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true,
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        threadedMessages: {
          include: {
            createdByUser: {
              select: {
                id: true,
                name: true,
                role: true,
                avatarUrl: true,
              }
            },
            attachments: {
              select: {
                id: true,
                fileName: true,
                mimeType: true,
              }
            },
          },
          orderBy: {
            createdAt: "asc"
          }
        },
        files: {
          orderBy: {
            createdAt: "desc"
          }
        },
        invoice: true,
        _count: {
          select: {
            messages: true,
            files: true,
          }
        }
      }
    })

    console.log("GET /api/work-orders/[id] - Found work order:", workOrder ? "Yes" : "No")
    if (workOrder) {
      console.log("GET /api/work-orders/[id] - Work order title:", workOrder.title)
      console.log("GET /api/work-orders/[id] - Work order number:", workOrder.workOrderNumber)
    }

    if (!workOrder) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 }
      )
    }

    const primaryThread = await prisma.messageThread.findFirst({
      where: { workOrderId },
      select: { id: true },
    })

    return NextResponse.json({
      ...workOrder,
      messageThreadId: primaryThread?.id ?? null,
      threadedMessages: (workOrder.threadedMessages || []).map((message) => ({
        ...message,
        attachments: (message.attachments || []).map((attachment) => ({
          ...attachment,
          isImage:
            attachment.mimeType?.startsWith("image/") ||
            /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachment.fileName),
        })),
      })),
    })
  } catch (error) {
    console.error("Work order fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: workOrderId } = await params
    const body = await request.json()
    const applyPropertyInfoToMatchingWorkOrders = body.applyPropertyInfoToMatchingWorkOrders === true

    if (applyPropertyInfoToMatchingWorkOrders && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can update shared property information." },
        { status: 403 }
      )
    }

    // Verify work order exists and user has access
    let whereClause: any = { id: workOrderId }

    if (session.user.role === "CLIENT") {
      whereClause.clientId = session.user.id
    } else if (session.user.role === "CONTRACTOR") {
      whereClause.assignedContractorId = session.user.id
    }

    const existingWorkOrder = await prisma.workOrder.findFirst({
      where: whereClause,
    })

    if (!existingWorkOrder) {
      return NextResponse.json(
        { error: "Work order not found or access denied" },
        { status: 404 }
      )
    }

    const parseOptionalDate = (value: unknown) => {
      if (!value || typeof value !== "string" || !value.trim()) return null
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? null : date
    }

    const parseOptionalFloat = (value: unknown) => {
      if (value === null || value === undefined || value === "") return null
      const num = Number(value)
      return Number.isFinite(num) ? num : null
    }

    const updateData = {
      status:
        typeof body.status === "string" && validWorkOrderStatuses.includes(body.status as typeof validWorkOrderStatuses[number])
          ? body.status
          : existingWorkOrder.status,
      title: typeof body.title === "string" ? body.title : existingWorkOrder.title,
      description: typeof body.description === "string" ? body.description : existingWorkOrder.description,
      serviceType: typeof body.serviceType === "string" ? body.serviceType : existingWorkOrder.serviceType,
      addressLine1: typeof body.addressLine1 === "string" ? body.addressLine1 : existingWorkOrder.addressLine1,
      addressLine2: typeof body.addressLine2 === "string" ? body.addressLine2 : existingWorkOrder.addressLine2,
      city: typeof body.city === "string" ? body.city : existingWorkOrder.city,
      state: typeof body.state === "string" ? body.state : existingWorkOrder.state,
      postalCode: typeof body.postalCode === "string" ? body.postalCode : existingWorkOrder.postalCode,
      dueDate: parseOptionalDate(body.dueDate),
      workOrderNumber: typeof body.workOrderNumber === "string" ? body.workOrderNumber : existingWorkOrder.workOrderNumber,
      coordinator: typeof body.coordinatorId === "string" ? body.coordinatorId : existingWorkOrder.coordinator,
      processor: typeof body.processorId === "string" ? body.processorId : existingWorkOrder.processor,
      gpsLat: parseOptionalFloat(body.gpsLat),
      gpsLon: parseOptionalFloat(body.gpsLon),
      lockCode: typeof body.lockCode === "string" ? body.lockCode : existingWorkOrder.lockCode,
      lockLocation: typeof body.lockLocation === "string" ? body.lockLocation : existingWorkOrder.lockLocation,
      keyCode: typeof body.keyCode === "string" ? body.keyCode : existingWorkOrder.keyCode,
      gateCode: typeof body.gateCode === "string" ? body.gateCode : existingWorkOrder.gateCode,
      lotSize: typeof body.lotSize === "string" ? body.lotSize : existingWorkOrder.lotSize,
      startDate: parseOptionalDate(body.startDate),
      estCompletion: parseOptionalDate(body.estCompletion),
      assignedContractorId:
        typeof body.assignedContractorId === "string" && body.assignedContractorId.trim()
          ? body.assignedContractorId
          : null,
      assignedCoordinatorId:
        typeof body.coordinatorId === "string" && body.coordinatorId.trim()
          ? body.coordinatorId
          : null,
      assignedProcessorId:
        typeof body.processorId === "string" && body.processorId.trim()
          ? body.processorId
          : null,
      updatedAt: new Date(),
    }

    let propertyUpdateCount = 1

    if (applyPropertyInfoToMatchingWorkOrders) {
      const propertyUpdateData = buildPropertyUpdateData(body, existingWorkOrder)
      const propertyMatch = buildPropertyMatch(existingWorkOrder)
      const propertyResult = await prisma.workOrder.updateMany({
        where: propertyMatch,
        data: propertyUpdateData,
      })
      propertyUpdateCount = propertyResult.count || 1
    }

    // Update work order
    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        assignedContractor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        _count: {
          select: {
            messages: true,
            files: true,
          }
        }
      }
    })

    // TODO: Send notifications based on status changes
    // TODO: Log status changes for audit trail

    return NextResponse.json({ 
      message: "Work order updated successfully", 
      workOrder: updatedWorkOrder,
      propertyUpdateCount,
    })
  } catch (error) {
    console.error("Work order update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: workOrderId } = await params
    const body = await request.json()
    const applyPropertyInfoToMatchingWorkOrders = body.applyPropertyInfoToMatchingWorkOrders === true

    if (applyPropertyInfoToMatchingWorkOrders && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can update shared property information." },
        { status: 403 }
      )
    }

    // Verify work order exists and user has access
    let whereClause: any = { id: workOrderId }

    if (session.user.role === "CLIENT") {
      whereClause.clientId = session.user.id
    } else if (session.user.role === "CONTRACTOR") {
      whereClause.assignedContractorId = session.user.id
    }

    const existingWorkOrder = await prisma.workOrder.findFirst({
      where: whereClause,
    })

    if (!existingWorkOrder) {
      return NextResponse.json(
        { error: "Work order not found or access denied" },
        { status: 404 }
      )
    }

    let propertyUpdateCount = 1

    if (applyPropertyInfoToMatchingWorkOrders) {
      const propertyUpdateData = buildPropertyUpdateData(body, existingWorkOrder)
      const propertyMatch = buildPropertyMatch(existingWorkOrder)
      const propertyResult = await prisma.workOrder.updateMany({
        where: propertyMatch,
        data: propertyUpdateData,
      })
      propertyUpdateCount = propertyResult.count || 1
    }

    const sanitizedBody = Object.fromEntries(
      Object.entries(body).filter(([key]) => key !== "applyPropertyInfoToMatchingWorkOrders")
    )

    // Update work order with partial data
    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        ...sanitizedBody,
        updatedAt: new Date(),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          }
        },
        assignedContractor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        messages: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true,
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        files: {
          orderBy: {
            createdAt: "desc"
          }
        },
        invoice: true,
        _count: {
          select: {
            messages: true,
            files: true,
          }
        }
      }
    })

    return NextResponse.json({ 
      message: "Work order updated successfully", 
      workOrder: updatedWorkOrder,
      propertyUpdateCount,
    })
  } catch (error) {
    console.error("Work order patch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can delete work orders" },
        { status: 403 }
      )
    }

    const { id: workOrderId } = await params

    const existingWorkOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true },
    })

    if (!existingWorkOrder) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 }
      )
    }

    const messages = await prisma.message.findMany({
      where: { workOrderId },
      select: { id: true },
    })

    const messageIds = messages.map((message) => message.id)

    await prisma.$transaction(async (tx) => {
      if (messageIds.length > 0) {
        await tx.notification.deleteMany({
          where: {
            OR: [
              { workOrderId },
              { messageId: { in: messageIds } },
            ],
          },
        })

        await tx.messageRead.deleteMany({
          where: { messageId: { in: messageIds } },
        })
      } else {
        await tx.notification.deleteMany({
          where: { workOrderId },
        })
      }

      const invoice = await tx.invoice.findUnique({
        where: { workOrderId },
        select: { id: true },
      })

      if (invoice) {
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: invoice.id },
        })

        await tx.invoice.delete({
          where: { id: invoice.id },
        })
      }

      await tx.fileAttachment.deleteMany({
        where: { workOrderId },
      })

      await tx.message.deleteMany({
        where: { workOrderId },
      })

      await tx.workOrder.delete({
        where: { id: workOrderId },
      })
    })

    return NextResponse.json({
      message: "Work order deleted successfully",
    })
  } catch (error) {
    console.error("Work order delete error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
