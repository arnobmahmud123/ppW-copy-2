import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

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

    return NextResponse.json(workOrder)
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

    // Update work order
    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        ...body,
        updatedAt: new Date(),
      },
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
      workOrder: updatedWorkOrder 
    })
  } catch (error) {
    console.error("Work order update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
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

    // Update work order with partial data
    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        ...body,
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
      workOrder: updatedWorkOrder 
    })
  } catch (error) {
    console.error("Work order patch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
