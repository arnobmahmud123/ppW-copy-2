import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [
      openTickets,
      inProgress,
      resolved,
      activeUsers,
    ] = await Promise.all([
      prisma.workOrder.count({
        where: {
          status: {
            in: ["NEW", "UNASSIGNED"],
          },
        },
      }),
      prisma.workOrder.count({
        where: {
          status: {
            in: ["IN_PROGRESS", "ASSIGNED", "READ"],
          },
        },
      }),
      prisma.workOrder.count({
        where: {
          status: {
            in: ["COMPLETED", "FIELD_COMPLETE", "OFFICE_APPROVED", "SENT_TO_CLIENT", "CLOSED"],
          },
        },
      }),
      prisma.user.count(),
    ])

    return NextResponse.json({
      openTickets,
      inProgress,
      resolved,
      activeUsers,
    })
  } catch (error) {
    console.error("Support metrics fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
