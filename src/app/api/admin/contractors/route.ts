import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const contractors = await prisma.user.findMany({
      where: {
        role: "CONTRACTOR"
      },
      include: {
        _count: {
          select: {
            workOrdersAsClient: true,
            workOrdersAssigned: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json({
      contractors: contractors.map((contractor) => ({
        id: contractor.id,
        name: contractor.name,
        email: contractor.email,
        phone: contractor.phone,
        company: contractor.company,
        address: "address" in contractor ? contractor.address : null,
        role: contractor.role,
        createdAt: contractor.createdAt,
        _count: contractor._count,
      })),
    })
  } catch (error) {
    console.error("Contractors fetch error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
