import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const messageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
  workOrderId: z.string().min(1, "Work order ID is required"),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = messageSchema.parse(body)

    // Verify work order exists and user has access
    let whereClause: any = { id: validatedData.workOrderId }

    // Admin users can access any work order
    if (session.user.role !== "ADMIN") {
      if (session.user.role === "CLIENT") {
        whereClause.clientId = session.user.id
      } else if (session.user.role === "CONTRACTOR") {
        whereClause.assignedContractorId = session.user.id
      } else {
        // For other roles (coordinators, processors), check if they are assigned to this work order
        whereClause.OR = [
          { assignedContractorId: session.user.id },
          { assignedCoordinatorId: session.user.id },
          { assignedProcessorId: session.user.id }
        ]
      }
    }

    const workOrder = await prisma.workOrder.findFirst({
      where: whereClause,
    })

    if (!workOrder) {
      return NextResponse.json(
        { error: "Work order not found or access denied" },
        { status: 404 }
      )
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: validatedData.content,
        workOrderId: validatedData.workOrderId,
        authorId: session.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          }
        },
        workOrder: {
          select: {
            id: true,
            title: true,
          }
        }
      }
    })

    // TODO: Send notification email to other participants
    // TODO: Real-time notification via WebSocket or Server-Sent Events

    return NextResponse.json(
      { message: "Message sent successfully", data: message },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Message creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const workOrderId = searchParams.get("workOrderId")

    // Build where clause based on user role
    let whereClause: any = {}

    if (workOrderId) {
      whereClause.workOrderId = workOrderId
    }

    // Get work orders user has access to
    let workOrderWhereClause: any = {}
    
    // Admin users can access any work order
    if (session.user.role !== "ADMIN") {
      if (session.user.role === "CLIENT") {
        workOrderWhereClause.clientId = session.user.id
      } else if (session.user.role === "CONTRACTOR") {
        workOrderWhereClause.assignedContractorId = session.user.id
      } else {
        // For other roles (coordinators, processors), check if they are assigned to this work order
        workOrderWhereClause.OR = [
          { assignedContractorId: session.user.id },
          { assignedCoordinatorId: session.user.id },
          { assignedProcessorId: session.user.id }
        ]
      }
    }

    const accessibleWorkOrders = await prisma.workOrder.findMany({
      where: workOrderWhereClause,
      select: { id: true }
    })

    const accessibleWorkOrderIds = accessibleWorkOrders.map(wo => wo.id)

    if (workOrderId) {
      if (!accessibleWorkOrderIds.includes(workOrderId)) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        )
      }
    } else {
      whereClause.workOrderId = { in: accessibleWorkOrderIds }
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          }
        },
        workOrder: {
          select: {
            id: true,
            title: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Messages fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
