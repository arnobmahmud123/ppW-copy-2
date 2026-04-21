import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getAdminAssetLogisticsInsights } from "@/modules/assets/queries"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await getAdminAssetLogisticsInsights()
    return NextResponse.json(payload)
  } catch (error) {
    console.error("Asset insights error:", error)
    return NextResponse.json({ error: "Unable to load asset and logistics insights." }, { status: 500 })
  }
}
