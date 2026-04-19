import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getAdminPropertiesOverview } from "@/modules/properties/queries"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const properties = await getAdminPropertiesOverview()
    return NextResponse.json({ properties })
  } catch (error) {
    console.error("Admin properties list error:", error)
    return NextResponse.json(
      { error: "Unable to load properties right now." },
      { status: 500 }
    )
  }
}
