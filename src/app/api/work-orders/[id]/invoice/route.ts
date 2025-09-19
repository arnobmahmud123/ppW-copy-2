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

    // Get invoice for this work order
    const invoice = await prisma.invoice.findFirst({
      where: { workOrderId },
      include: {
        items: true
      }
    })

    return NextResponse.json(invoice || null)
  } catch (error) {
    console.error("Error fetching invoice:", error)
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
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: workOrderId } = await params
    const body = await request.json()

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

    // Create or update invoice
    const invoice = await prisma.invoice.upsert({
      where: { workOrderId },
      update: {
        clientId: body.clientId,
        invoiceNumber: body.invoiceNumber,
        invoiceDate: new Date(body.invoiceDate),
        status: body.status,
        sentToClientDate: body.sentToClientDate ? new Date(body.sentToClientDate) : null,
        completeDate: body.completeDate ? new Date(body.completeDate) : null,
        noCharge: body.noCharge,
        clientTotal: body.clientTotal,
        notes: body.notes,
        updatedAt: new Date(),
      },
      create: {
        workOrderId,
        clientId: body.clientId,
        invoiceNumber: body.invoiceNumber,
        invoiceDate: new Date(body.invoiceDate),
        status: body.status,
        sentToClientDate: body.sentToClientDate ? new Date(body.sentToClientDate) : null,
        completeDate: body.completeDate ? new Date(body.completeDate) : null,
        noCharge: body.noCharge,
        clientTotal: body.clientTotal,
        notes: body.notes,
      },
    })

    // Handle invoice items
    if (body.items && Array.isArray(body.items)) {
      // Delete existing items
      await prisma.invoiceItem.deleteMany({
        where: { invoiceId: invoice.id }
      })

      // Create new items
      await prisma.invoiceItem.createMany({
        data: body.items.map((item: any) => ({
          invoiceId: invoice.id,
          item: item.item,
          qty: item.qty,
          price: item.price,
          total: item.total,
          adjPrice: item.adjPrice,
          discountPercent: item.discountPercent,
          finalTotal: item.finalTotal,
          comments: item.comments,
          flatFee: item.flatFee,
        }))
      })
    }

    // Return updated invoice with items
    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        items: true
      }
    })

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error("Error saving invoice:", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
