import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getAdminFinanceInsights } from "@/modules/finance/queries"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const insights = await getAdminFinanceInsights()
    return NextResponse.json(insights)
  } catch (error) {
    console.error("Admin finance insights error:", error)
    return NextResponse.json({ error: "Unable to load finance insights right now." }, { status: 500 })
  }
}
