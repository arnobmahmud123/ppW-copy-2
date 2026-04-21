import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const automations = await db.aICallAutomation.findMany({
      include: {
        createdByUser: { select: { name: true, email: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({ automations })
  } catch (error) {
    console.error("AI call automation list error:", error)
    return NextResponse.json({ error: "Unable to load call automations." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const name = String(body.name || "").trim()
    const audienceType = String(body.audienceType || "").trim()
    const triggerType = String(body.triggerType || "").trim()
    const instructions = String(body.instructions || "").trim()

    if (!name || !audienceType || !triggerType || !instructions) {
      return NextResponse.json({ error: "Name, audience, trigger, and instructions are required." }, { status: 400 })
    }

    const automation = await db.aICallAutomation.create({
      data: {
        name,
        audienceType,
        triggerType,
        instructions,
        status: typeof body.status === "string" ? body.status : "ACTIVE",
        voiceProfile: typeof body.voiceProfile === "string" ? body.voiceProfile : null,
        destinationType: typeof body.destinationType === "string" ? body.destinationType : "PHONE",
        phoneField: typeof body.phoneField === "string" ? body.phoneField : null,
        scheduleSummary: typeof body.scheduleSummary === "string" ? body.scheduleSummary : null,
        escalationEnabled: Boolean(body.escalationEnabled),
        createdByUserId: session.user.id,
      },
      include: {
        createdByUser: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json({ automation }, { status: 201 })
  } catch (error) {
    console.error("AI call automation create error:", error)
    return NextResponse.json({ error: "Unable to create call automation." }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const id = String(body.id || "").trim()
    if (!id) {
      return NextResponse.json({ error: "Automation id is required." }, { status: 400 })
    }

    const automation = await db.aICallAutomation.update({
      where: { id },
      data: {
        status: typeof body.status === "string" ? body.status : undefined,
        nextRunAt: body.nextRunAt ? new Date(body.nextRunAt) : undefined,
        lastRunAt: body.lastRunAt ? new Date(body.lastRunAt) : undefined,
        scheduleSummary: typeof body.scheduleSummary === "string" ? body.scheduleSummary : undefined,
        instructions: typeof body.instructions === "string" ? body.instructions : undefined,
      },
      include: {
        createdByUser: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json({ automation })
  } catch (error) {
    console.error("AI call automation update error:", error)
    return NextResponse.json({ error: "Unable to update call automation." }, { status: 500 })
  }
}
