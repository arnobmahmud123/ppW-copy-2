import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getCoordinatorConsoleData } from "@/modules/workforce/queries"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await getCoordinatorConsoleData()
    return NextResponse.json(payload)
  } catch (error) {
    console.error("Admin coordinators error:", error)
    return NextResponse.json(
      { error: "Unable to load coordinator console right now." },
      { status: 500 }
    )
  }
}
