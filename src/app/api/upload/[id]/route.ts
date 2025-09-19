export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import fs from "fs"
import path from "path"

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

    // Find the file attachment
    const fileAttachment = await prisma.fileAttachment.findUnique({
      where: { id },
      include: { workOrder: true }
    })

    if (!fileAttachment) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }

    // Check if user has access to this work order
    if (session.user.role === "CONTRACTOR") {
      if (fileAttachment.workOrder.assignedContractorId !== session.user.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        )
      }
    } else if (session.user.role === "COORDINATOR") {
      if (fileAttachment.workOrder.assignedCoordinatorId !== session.user.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        )
      }
    } else if (session.user.role === "PROCESSOR") {
      if (fileAttachment.workOrder.assignedProcessorId !== session.user.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        )
      }
    }

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
