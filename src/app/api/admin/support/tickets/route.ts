import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

function mapTicketStatus(status: string) {
  switch (status) {
    case "NEW":
    case "UNASSIGNED":
      return "OPEN"
    case "IN_PROGRESS":
    case "ASSIGNED":
    case "READ":
      return "IN_PROGRESS"
    default:
      return "RESOLVED"
  }
}

function mapTicketPriority(status: string) {
  switch (status) {
    case "NEW":
    case "UNASSIGNED":
      return "HIGH"
    case "IN_PROGRESS":
    case "ASSIGNED":
    case "READ":
      return "MEDIUM"
    default:
      return "LOW"
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workOrders = await prisma.workOrder.findMany({
      include: {
        client: {
          select: {
            name: true,
            company: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
    })

    const tickets = workOrders.map((workOrder) => ({
      id: workOrder.id,
      title: workOrder.title,
      status: mapTicketStatus(workOrder.status),
      priority: mapTicketPriority(workOrder.status),
      client: workOrder.client.company || workOrder.client.name,
      createdAt: workOrder.createdAt,
      workOrderId: workOrder.id,
      workOrderNumber: workOrder.workOrderNumber || workOrder.id,
    }))

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error("Support tickets fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
