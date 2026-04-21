import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import {
  getEmailBusinessIntelligence,
  parseEmailIntelligence,
} from "@/modules/operations-ai/queries"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await getEmailBusinessIntelligence()
    return NextResponse.json(payload)
  } catch (error) {
    console.error("Email intelligence error:", error)
    return NextResponse.json({ error: "Unable to load email intelligence." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const content = String(body.content || "").trim()
    if (!content) {
      return NextResponse.json({ error: "Email content is required." }, { status: 400 })
    }

    const parsed = await parseEmailIntelligence({
      content,
      subject: typeof body.subject === "string" ? body.subject : "",
      from: typeof body.from === "string" ? body.from : "",
    })

    return NextResponse.json(parsed)
  } catch (error) {
    console.error("Email parse error:", error)
    return NextResponse.json({ error: "Unable to parse this email right now." }, { status: 500 })
  }
}
