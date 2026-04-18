import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

const markReadSchema = z.object({
  workOrderId: z.string().min(1, "Work order ID is required"),
})

function getWorkOrderAccessWhere(role: string, userId: string, workOrderId: string) {
  if (role === "ADMIN") {
    return { id: workOrderId }
  }

  if (role === "CLIENT") {
    return { id: workOrderId, clientId: userId }
  }

  if (role === "CONTRACTOR") {
    return { id: workOrderId, assignedContractorId: userId }
  }

  return {
    id: workOrderId,
    OR: [
      { assignedContractorId: userId },
      { assignedCoordinatorId: userId },
      { assignedProcessorId: userId },
    ],
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = markReadSchema.parse(body)

    const accessibleWorkOrder = await prisma.workOrder.findFirst({
      where: getWorkOrderAccessWhere(session.user.role, session.user.id, validatedData.workOrderId),
      select: { id: true },
    })

    if (!accessibleWorkOrder) {
      return NextResponse.json({ error: "Work order not found or access denied" }, { status: 404 })
    }

    const unreadMessages = await prisma.message.findMany({
      where: {
        workOrderId: validatedData.workOrderId,
        authorId: {
          not: session.user.id,
        },
        reads: {
          none: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
      },
    })

    if (unreadMessages.length > 0) {
      await prisma.messageRead.createMany({
        data: unreadMessages.map((message) => ({
          messageId: message.id,
          userId: session.user.id,
        })),
      })
    }

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        workOrderId: validatedData.workOrderId,
        type: "MESSAGE",
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, markedCount: unreadMessages.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 })
    }

    console.error("Mark messages read error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
