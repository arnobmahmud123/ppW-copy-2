import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
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
    const { tasks } = body

    // Verify work order exists and user has access
    let whereClause: any = { id: workOrderId }

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

    const existingWorkOrder = await prisma.workOrder.findFirst({
      where: whereClause,
    })

    if (!existingWorkOrder) {
      return NextResponse.json(
        { error: "Work order not found or access denied" },
        { status: 404 }
      )
    }

    // Store tasks as JSON in the tasks field
    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        tasks: JSON.stringify(tasks),
        updatedAt: new Date(),
      }
    })

    return NextResponse.json({
      message: "Tasks saved successfully",
      tasks: tasks
    })
  } catch (error) {
    console.error("Task save error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(
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

    // Verify work order exists and user has access
    let whereClause: any = { id: workOrderId }

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

    // Parse tasks from JSON string
    let tasks = []
    if (workOrder.tasks) {
      try {
        tasks = JSON.parse(workOrder.tasks)
      } catch (error) {
        console.error("Error parsing tasks JSON:", error)
        tasks = []
      }
    }

    return NextResponse.json({
      tasks: tasks
    })
  } catch (error) {
    console.error("Task fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
