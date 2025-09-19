import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const assignSchema = z.object({
  assignedContractorId: z.string().optional(),
  assignedCoordinatorId: z.string().optional(),
  assignedProcessorId: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: workOrderId } = await params
    const body = await request.json()
    
    const validatedData = assignSchema.parse(body)

    // Verify work order exists
    const workOrder = await prisma.workOrder.findFirst({
      where: { id: workOrderId },
    })

    if (!workOrder) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 }
      )
    }

    // Update work order assignments
    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        assignedContractorId: validatedData.assignedContractorId || null,
        assignedCoordinatorId: validatedData.assignedCoordinatorId || null,
        assignedProcessorId: validatedData.assignedProcessorId || null,
        assignedDate: new Date(), // Set assigned date when assignments are made
      },
      include: {
        assignedContractor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          }
        },
        assignedCoordinator: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          }
        },
        assignedProcessor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          }
        },
      }
    })

    return NextResponse.json(updatedWorkOrder)
  } catch (error) {
    console.error("Error assigning work order:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
