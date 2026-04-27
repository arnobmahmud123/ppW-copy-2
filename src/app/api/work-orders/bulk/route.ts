import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

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

const bulkUpdateSchema = z.object({
  workOrderIds: z.array(z.string().min(1)).min(1),
  assignedContractorId: z.string().optional(),
  assignedCoordinatorId: z.string().optional(),
  assignedProcessorId: z.string().optional(),
  status: z.enum(validWorkOrderStatuses).optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const payload = bulkUpdateSchema.parse(body)
    const uniqueIds = [...new Set(payload.workOrderIds)]

    if (
      payload.assignedContractorId === undefined &&
      payload.assignedCoordinatorId === undefined &&
      payload.assignedProcessorId === undefined &&
      payload.status === undefined
    ) {
      return NextResponse.json(
        { error: "No bulk update fields provided" },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (payload.assignedContractorId !== undefined) {
      updateData.assignedContractorId = payload.assignedContractorId || null
    }
    if (payload.assignedCoordinatorId !== undefined) {
      updateData.assignedCoordinatorId = payload.assignedCoordinatorId || null
    }
    if (payload.assignedProcessorId !== undefined) {
      updateData.assignedProcessorId = payload.assignedProcessorId || null
    }
    if (
      payload.assignedContractorId !== undefined ||
      payload.assignedCoordinatorId !== undefined ||
      payload.assignedProcessorId !== undefined
    ) {
      updateData.assignedDate = new Date()
    }
    if (payload.status !== undefined) {
      updateData.status = payload.status
    }

    const result = await prisma.workOrder.updateMany({
      where: { id: { in: uniqueIds } },
      data: updateData,
    })

    return NextResponse.json({
      message: "Bulk update completed",
      updatedCount: result.count,
    })
  } catch (error) {
    console.error("Bulk work order update error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
