export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import fs from "fs"
import path from "path"

async function getAuthorizedFileAttachment(id: string, user: { id: string; role: string }) {
  const fileAttachment = await prisma.fileAttachment.findUnique({
    where: { id },
    include: { workOrder: true }
  })

  if (!fileAttachment) {
    return { error: NextResponse.json({ error: "File not found" }, { status: 404 }) }
  }

  if (user.role === "CONTRACTOR" && fileAttachment.workOrder.assignedContractorId !== user.id) {
    return { error: NextResponse.json({ error: "Access denied" }, { status: 403 }) }
  }

  if (user.role === "COORDINATOR" && fileAttachment.workOrder.assignedCoordinatorId !== user.id) {
    return { error: NextResponse.json({ error: "Access denied" }, { status: 403 }) }
  }

  if (user.role === "PROCESSOR" && fileAttachment.workOrder.assignedProcessorId !== user.id) {
    return { error: NextResponse.json({ error: "Access denied" }, { status: 403 }) }
  }

  return { fileAttachment }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Allow contractors, coordinators, processors, and admins to delete files
    if (!["CONTRACTOR", "COORDINATOR", "PROCESSOR", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const { id } = await params

    const result = await getAuthorizedFileAttachment(id, {
      id: session.user.id,
      role: session.user.role,
    })
    if (result.error) {
      return result.error
    }
    const { fileAttachment } = result

    // Delete the physical file
    try {
      const filePath = path.join(process.cwd(), "public", fileAttachment.url)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (fsError) {
      console.error("Error deleting physical file:", fsError)
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await prisma.fileAttachment.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting file:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!["CONTRACTOR", "COORDINATOR", "PROCESSOR", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const { id } = await params
    const result = await getAuthorizedFileAttachment(id, {
      id: session.user.id,
      role: session.user.role,
    })
    if (result.error) {
      return result.error
    }
    const { fileAttachment } = result

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadsDir = path.join(process.cwd(), "public", "uploads", fileAttachment.workOrderId)
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const extension = path.extname(file.name || fileAttachment.url || ".png") || ".png"
    const nextFilename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`
    const nextFilePath = path.join(uploadsDir, nextFilename)
    const nextUrl = `/uploads/${fileAttachment.workOrderId}/${nextFilename}`
    const nextKey = `work-orders/${fileAttachment.workOrderId}/${nextFilename}`

    fs.writeFileSync(nextFilePath, buffer)

    const updatedAttachment = await prisma.fileAttachment.update({
      where: { id },
      data: {
        url: nextUrl,
        key: nextKey,
        mimeType: file.type || fileAttachment.mimeType,
      }
    })

    if (fileAttachment.workOrder.tasks) {
      try {
        const parsedTasks = JSON.parse(fileAttachment.workOrder.tasks)
        if (Array.isArray(parsedTasks)) {
          const nextTasks = parsedTasks.map((task: any) => {
            if (!Array.isArray(task?.photoRequirements)) {
              return task
            }

            return {
              ...task,
              photoRequirements: task.photoRequirements.map((requirement: any) => {
                const uploads = Array.isArray(requirement?.uploads) ? requirement.uploads : []
                const nextUploads = uploads.map((upload: any) =>
                  upload?.id === fileAttachment.id
                    ? { ...upload, url: nextUrl }
                    : upload
                )

                const nextRequirement = { ...requirement, uploads: nextUploads }
                if (requirement?.fileId === fileAttachment.id || requirement?.id === fileAttachment.requirementId) {
                  nextRequirement.url = nextUploads[0]?.url || nextUrl
                } else if (requirement?.url && requirement.url === fileAttachment.url) {
                  nextRequirement.url = nextUrl
                }

                return nextRequirement
              })
            }
          })

          await prisma.workOrder.update({
            where: { id: fileAttachment.workOrderId },
            data: {
              tasks: JSON.stringify(nextTasks),
            }
          })
        }
      } catch (taskError) {
        console.error("Error updating tasks JSON for replaced file:", taskError)
      }
    }

    try {
      const oldFilePath = path.join(process.cwd(), "public", fileAttachment.url)
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath)
      }
    } catch (fsError) {
      console.error("Error deleting replaced file:", fsError)
    }

    return NextResponse.json({
      success: true,
      fileAttachment: {
        id: updatedAttachment.id,
        url: updatedAttachment.url,
        mimeType: updatedAttachment.mimeType,
        category: updatedAttachment.category,
      }
    })
  } catch (error) {
    console.error("Error updating file:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
