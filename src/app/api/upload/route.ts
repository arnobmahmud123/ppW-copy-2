export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import fs from "fs"
import path from "path"

const uploadSchema = z.object({
  workOrderId: z.string().min(1, "Work order ID is required"),
  // Accept both enum values and simpler labels then map internally
  category: z.string().min(1)
})

function mapCategory(input: string): "PHOTO_BEFORE" | "PHOTO_DURING" | "PHOTO_AFTER" | "PHOTO_BID" | "PHOTO_INSPECTION" | "DOCUMENT_PDF" | "DOCUMENT_PCR" | "OTHER" {
  switch (input) {
    case "PHOTO_BEFORE":
    case "BEFORE":
      return "PHOTO_BEFORE"
    case "PHOTO_DURING":
    case "DURING":
      return "PHOTO_DURING"
    case "PHOTO_AFTER":
    case "AFTER":
      return "PHOTO_AFTER"
    case "PHOTO_BID":
    case "BID":
      return "PHOTO_BID"
    case "PHOTO_INSPECTION":
    case "INSPECTION":
      return "PHOTO_INSPECTION"
    case "DOCUMENT_PDF":
      return "DOCUMENT_PDF"
    case "DOCUMENT_PCR":
      return "DOCUMENT_PCR"
    default:
      console.warn("Unknown category:", input, "falling back to OTHER")
      return "OTHER"
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Allow contractors, coordinators, processors, and admins to upload files
    if (!["CONTRACTOR", "COORDINATOR", "PROCESSOR", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Not allowed" },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const workOrderId = (formData.get("workOrderId") as string) || ""
    const rawCategory = (formData.get("category") as string) || ""
    const taskId = (formData.get("taskId") as string) || undefined
    const requirementId = (formData.get("requirementId") as string) || undefined

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    const validatedData = uploadSchema.parse({
      workOrderId,
      category: rawCategory,
    })

    const category = mapCategory(validatedData.category)
    console.log("Upload request - category:", validatedData.category, "mapped to:", category)

    // Verify work order exists and user has access
    let whereClause: any = { id: validatedData.workOrderId }
    
    // Admin users can access any work order
    if (session.user.role !== "ADMIN") {
      if (session.user.role === "CONTRACTOR") {
        whereClause.assignedContractorId = session.user.id
      } else if (session.user.role === "COORDINATOR") {
        whereClause.assignedCoordinatorId = session.user.id
      } else if (session.user.role === "PROCESSOR") {
        whereClause.assignedProcessorId = session.user.id
      }
    }

    const workOrder = await prisma.workOrder.findFirst({ where: whereClause })

    if (!workOrder) {
      return NextResponse.json(
        { error: "Work order not found or access denied" },
        { status: 404 }
      )
    }

    // Persist file under public/uploads for dev/demo
    let fileUrl = ""
    let fileKey = ""
    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const uploadsDir = path.join(process.cwd(), "public", "uploads", validatedData.workOrderId)
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }
      const sanitizedName = path.basename(file.name || `upload-${Date.now()}`)
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${sanitizedName}`
      const filePath = path.join(uploadsDir, filename)
      fs.writeFileSync(filePath, buffer)

      fileUrl = `/uploads/${validatedData.workOrderId}/${filename}`
      fileKey = `work-orders/${validatedData.workOrderId}/${filename}`
    } catch (fsErr: any) {
      console.error("File system write error:", fsErr)
      return NextResponse.json(
        { error: "File system error", details: fsErr?.message || "Could not write file" },
        { status: 500 }
      )
    }

    let fileAttachment
    try {
      fileAttachment = await prisma.fileAttachment.create({
        data: {
          url: fileUrl,
          key: fileKey,
          mimeType: (file as any).type || "application/octet-stream",
          category: category,
          workOrderId: validatedData.workOrderId,
          taskId,
          requirementId,
        },
      })
    } catch (dbErr: any) {
      console.error("Database error details:", {
        message: dbErr?.message,
        code: dbErr?.code,
        name: dbErr?.name,
        meta: dbErr?.meta,
        category: category
      })
      // Retry path for old schema that lacks taskId/requirementId columns
      const text = String(dbErr?.message || "")
      const looksLikeMissingColumn = text.includes("no such column") || text.includes("Unknown arg") || text.includes("P2021")
      if (looksLikeMissingColumn) {
        try {
          fileAttachment = await prisma.fileAttachment.create({
            data: {
              url: fileUrl,
              key: fileKey,
              mimeType: (file as any).type || "application/octet-stream",
              category: category,
              workOrderId: validatedData.workOrderId,
            },
          })
        } catch (retryErr: any) {
          console.error("Prisma create error (fallback):", retryErr)
          return NextResponse.json(
            { error: "Database error", details: retryErr?.message || "Could not save file attachment" },
            { status: 500 }
          )
        }
      } else {
        // Retry once with a new unique key if unique constraint on key/url
        const msg = String(dbErr?.message || "")
        const code = (dbErr && (dbErr.code || dbErr.name)) || ""
        const meta = (dbErr && dbErr.meta) ? JSON.stringify(dbErr.meta) : ""
        const isUnique = msg.includes("Unique") || msg.includes("unique") || msg.includes("P2002")
        if (isUnique) {
          const altKey = `work-orders/${validatedData.workOrderId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${path.basename(fileUrl)}`
          try {
            fileAttachment = await prisma.fileAttachment.create({
              data: {
                url: fileUrl,
                key: altKey,
                mimeType: (file as any).type || "application/octet-stream",
                category: category,
                workOrderId: validatedData.workOrderId,
                taskId,
                requirementId,
              },
            })
          } catch (dbErr2: any) {
            console.error("Prisma create error (retry):", dbErr2)
            return NextResponse.json(
              { error: "Database error", details: `${dbErr2?.message || "Could not save file attachment"} ${dbErr2?.code ? `(code ${dbErr2.code})` : ""}` },
              { status: 500 }
            )
          }
        } else {
          console.error("Prisma create error:", dbErr)
          return NextResponse.json(
            { error: "Database error", details: `${msg} ${code ? `(code ${code})` : ""} ${meta ? `meta ${meta}` : ""}`.trim() },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json(
      { 
        message: "File uploaded successfully",
        fileAttachment: {
          id: fileAttachment.id,
          url: fileAttachment.url,
          mimeType: fileAttachment.mimeType,
          category: fileAttachment.category,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }

    console.error("File upload error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: (error as any)?.message || "" },
      { status: 500 }
    )
  }
}
