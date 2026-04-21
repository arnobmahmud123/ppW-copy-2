import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getDispatchRecommendations } from "@/modules/operations-ai/queries"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await getDispatchRecommendations()
    return NextResponse.json(payload)
  } catch (error) {
    console.error("Dispatch recommendations error:", error)
    return NextResponse.json({ error: "Unable to load dispatch recommendations." }, { status: 500 })
  }
}
