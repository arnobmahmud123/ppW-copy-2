import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { BID_GUIDANCE } from "@/lib/ai/bid-guidance"
import { findMatchingBidTemplates } from "@/lib/ai/bid-sheet-templates"
import { findRelevantBidSheetExcerpts } from "@/lib/ai/bid-sheet-search"

type JsonTask = {
  id?: string
  taskType?: string
  taskName?: string
  customTaskName?: string
  qty?: number
  uom?: string
  contractorPrice?: number
  clientPrice?: number
  comments?: string
  violation?: boolean
  damage?: boolean
  hazards?: boolean
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const selectedTask = body?.selectedTask as JsonTask | undefined
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            name: true,
            company: true,
            email: true,
          },
        },
        assignedContractor: {
          select: {
            name: true,
            company: true,
            email: true,
          },
        },
        files: {
          select: {
            id: true,
            category: true,
            mimeType: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 })
    }

    const openAiKey = process.env.OPENAI_API_KEY
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!openAiKey && !geminiKey) {
      return NextResponse.json({ error: "No AI API key is configured" }, { status: 500 })
    }

    let parsedTasks: JsonTask[] = []
    if (workOrder.tasks) {
      try {
        const maybeTasks = JSON.parse(workOrder.tasks)
        if (Array.isArray(maybeTasks)) {
          parsedTasks = maybeTasks
        }
      } catch {
        parsedTasks = []
      }
    }

    const existingBidTasks = parsedTasks
      .filter((task) => task?.taskType === "Bid")
      .map((task) => ({
        taskName: task.taskName,
        customTaskName: task.customTaskName,
        qty: task.qty,
        uom: task.uom,
        contractorPrice: task.contractorPrice,
        clientPrice: task.clientPrice,
        comments: task.comments,
      }))

    const nonBidTasks = parsedTasks
      .filter((task) => task?.taskType && task.taskType !== "Bid")
      .map((task) => ({
        taskType: task.taskType,
        taskName: task.taskName,
        customTaskName: task.customTaskName,
        qty: task.qty,
        uom: task.uom,
        contractorPrice: task.contractorPrice,
        clientPrice: task.clientPrice,
        comments: task.comments,
        violation: task.violation,
        damage: task.damage,
        hazards: task.hazards,
      }))

    const fileSummary = workOrder.files.reduce<Record<string, number>>((acc, file) => {
      acc[file.category] = (acc[file.category] || 0) + 1
      return acc
    }, {})

    if (!selectedTask) {
      return NextResponse.json({ error: "Selected bid row is required" }, { status: 400 })
    }

    const selectedTaskLabel = [
      selectedTask.taskName,
      selectedTask.customTaskName,
      selectedTask.comments,
    ]
      .filter(Boolean)
      .join(" ")

    const matchedExcerpts = findRelevantBidSheetExcerpts(selectedTaskLabel, 4)
    const matchingTemplates = findMatchingBidTemplates(selectedTaskLabel).slice(0, 3)
    if (matchedExcerpts.length === 0 && matchingTemplates.length === 0) {
      return NextResponse.json(
        { error: "No matching bid-sheet content found for this line item" },
        { status: 400 }
      )
    }

    const userPrompt = [
      `Generate one bid item for the selected line item using the matched bid-sheet template.`,
      `Title: ${workOrder.title}`,
      `Description: ${workOrder.description || "None"}`,
      `Service type: ${workOrder.serviceType}`,
      `Status: ${workOrder.status}`,
      `Address: ${workOrder.addressLine1}, ${workOrder.city}, ${workOrder.state} ${workOrder.postalCode}`,
      `Due date: ${workOrder.dueDate ? workOrder.dueDate.toISOString() : "None"}`,
      `Client: ${workOrder.client.name}${workOrder.client.company ? ` (${workOrder.client.company})` : ""}`,
      `Assigned contractor: ${workOrder.assignedContractor?.name || "None"}`,
      `Existing non-bid tasks: ${JSON.stringify(nonBidTasks)}`,
      `Attached file category counts: ${JSON.stringify(fileSummary)}`,
      `Selected bid row: ${JSON.stringify(selectedTask)}`,
      `Matched bid-sheet excerpts: ${JSON.stringify(matchedExcerpts)}`,
      `Matched bid-sheet templates: ${JSON.stringify(matchingTemplates)}`,
      `Use the matched bid-sheet excerpts first. Keep the wording and pricing logic aligned with the sheet.`,
      `Return exactly one updated bid item in JSON: {"bidItems":[...one item...]}.`,
    ].join("\n")

    let content = ""

    if (geminiKey) {
      const geminiModel = process.env.GEMINI_BID_MODEL || "gemini-2.5-flash"
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": geminiKey,
          },
          body: JSON.stringify({
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${BID_GUIDANCE}\nReturn valid JSON with the shape: {"bidItems":[...]}.\n\n${userPrompt}`,
                  },
                ],
              },
            ],
          }),
        }
      )

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text()
        return NextResponse.json(
          { error: "AI bid generation failed", details: errorText },
          { status: 500 }
        )
      }

      const geminiData = await geminiResponse.json()
      content = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ""
    } else {
      const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_BID_MODEL || "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: `${BID_GUIDANCE}\nReturn valid JSON with the shape: {"bidItems":[...]}.`,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          response_format: {
            type: "json_object",
          },
        }),
      })

      if (!openAiResponse.ok) {
        const errorText = await openAiResponse.text()
        return NextResponse.json(
          { error: "AI bid generation failed", details: errorText },
          { status: 500 }
        )
      }

      const completion = await openAiResponse.json()
      content = completion?.choices?.[0]?.message?.content || ""
    }

    if (!content) {
      return NextResponse.json({ error: "AI returned empty content" }, { status: 500 })
    }

    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON", details: content },
        { status: 500 }
      )
    }
    const bidItems = Array.isArray(parsed?.bidItems) ? parsed.bidItems.slice(0, 1) : []

    const normalizedBidItems = bidItems.map((item: any, index: number) => ({
      id: selectedTask.id || `ai-bid-${Date.now()}-${index}`,
      taskType: "Bid",
      taskName: item.taskName || "Other",
      customTaskName: item.taskName === "Other" ? item.customTaskName || "" : item.customTaskName || "",
      qty: Number(item.qty) || Number(selectedTask.qty) || 1,
      uom: item.uom || selectedTask.uom || "EACH",
      contractorPrice: Number(item.contractorPrice) || 0,
      clientPrice: Number(item.clientPrice) || 0,
      comments: String(item.comments || "").trim(),
      violation: Boolean(item.violation),
      damage: Boolean(item.damage),
      hazards: Boolean(item.hazards),
      photoRequirements: [],
    }))

    return NextResponse.json({ bidItem: normalizedBidItems[0] || null, matchedTemplates: matchingTemplates })
  } catch (error) {
    console.error("AI bid generation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
