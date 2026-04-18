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
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: workOrderId } = await params
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const bidId = searchParams.get('bidId')

    // Verify work order exists and user has access
    let whereClause: any = { id: workOrderId }

    // Admin users can access any work order
    if (session.user.role !== "ADMIN") {
      if (session.user.role === "CLIENT") {
        whereClause.clientId = session.user.id
      } else if (session.user.role === "CONTRACTOR") {
        whereClause.assignedContractorId = session.user.id
      } else {
        // For other roles, check if they are assigned to this work order
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

    // Build message query
    let messageWhere: any = { workOrderId }
    
    if (taskId) {
      messageWhere.taskId = taskId
    } else if (bidId) {
      messageWhere.bidId = bidId
    }

    const messages = await prisma.message.findMany({
      where: messageWhere,
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
        createdAt: "asc"
      }
    })

    const thread = !taskId && !bidId
      ? await prisma.messageThread.findFirst({
          where: { workOrderId },
          select: {
            id: true,
            messages: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                body: true,
                authorType: true,
                messageType: true,
                visibilityScope: true,
                createdAt: true,
                updatedAt: true,
                createdByUserId: true,
                createdByUser: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                    role: true,
                  }
                },
                attachments: {
                  select: {
                    id: true,
                    fileName: true,
                    mimeType: true,
                  }
                },
              }
            }
          }
        })
      : null

    return NextResponse.json({
      threadId: thread?.id ?? null,
      messages,
      threadedMessages:
        thread?.messages.map((message) => ({
          ...message,
          attachments: (message.attachments ?? []).map((attachment) => ({
            ...attachment,
            isImage:
              attachment.mimeType?.startsWith("image/") ||
              /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachment.fileName),
          })),
        })) ?? [],
    })
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log("Session:", session)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: workOrderId } = await params
    const body = await request.json()
    const { content, taskId, bidId } = body
    
    console.log("Creating message with data:", {
      workOrderId,
      content,
      taskId,
      bidId,
      authorId: session.user.id
    })

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      )
    }

    // Verify work order exists and user has access
    let whereClause: any = { id: workOrderId }

    // Admin users can access any work order
    if (session.user.role !== "ADMIN") {
      if (session.user.role === "CLIENT") {
        whereClause.clientId = session.user.id
      } else if (session.user.role === "CONTRACTOR") {
        whereClause.assignedContractorId = session.user.id
      } else {
        // For other roles, check if they are assigned to this work order
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

    console.log("Work order found:", workOrder ? "Yes" : "No")

    if (!workOrder) {
      return NextResponse.json(
        { error: "Work order not found or access denied" },
        { status: 404 }
      )
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        workOrderId,
        authorId: session.user.id,
        taskId: taskId || null,
        bidId: bidId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          }
        }
      }
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error("Error creating message:", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
