import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getAdminPropertyDetail } from "@/modules/properties/queries"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ propertyKey: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { propertyKey } = await params
    const property = await getAdminPropertyDetail(propertyKey)

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 })
    }

    return NextResponse.json(property)
  } catch (error) {
    console.error("Admin property detail error:", error)
    return NextResponse.json(
      { error: "Unable to load this property right now." },
      { status: 500 }
    )
  }
}
