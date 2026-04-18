export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import archiver from "archiver"
import { Readable } from "stream"
import path from "path"
import fs from "fs"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(request.url)
  const scope = url.searchParams.get("scope") || "all"
  const taskId = url.searchParams.get("taskId") || undefined
  const requirementId = url.searchParams.get("requirementId") || undefined
  const fileIds = url.searchParams.getAll("fileId")

  // Build where clause based on scope
  let whereClause: any = { workOrderId: id }
  
  if (scope === "selected" && fileIds.length > 0) {
    whereClause.id = { in: fileIds }
  } else if (scope === "task" && taskId) {
    whereClause.taskId = taskId
  } else if (scope === "requirement" && requirementId) {
    whereClause.requirementId = requirementId
  }

  // Fetch photo attachments for the work order
  const attachments = await prisma.fileAttachment.findMany({
    where: whereClause,
    orderBy: { createdAt: "asc" }
  })

  // Create archiver zip
  const archive = archiver("zip", { zlib: { level: 9 } })
  const stream = new Readable({ read() {} })

  archive.on("data", (data) => {
    stream.push(data)
  })
  archive.on("end", () => {
    stream.push(null)
  })

  // Add files from public path by reading them
  for (const file of attachments) {
    // Only include photos
    if (!file.mimeType.startsWith("image/")) continue
    const publicPath = path.join(process.cwd(), "public", file.url.replace(/^\//, ""))
    if (fs.existsSync(publicPath)) {
      const name = path.basename(publicPath)
      archive.file(publicPath, { name })
    }
  }

  archive.finalize()

  // Generate filename based on scope
  let filename = `workorder-${id}-photos.zip`
  if (scope === "selected" && fileIds.length > 0) {
    filename = `workorder-${id}-selected-photos.zip`
  } else if (scope === "task" && taskId) {
    filename = `workorder-${id}-task-${taskId}-photos.zip`
  } else if (scope === "requirement" && requirementId) {
    filename = `workorder-${id}-requirement-${requirementId}-photos.zip`
  }

  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=${filename}`
    }
  })
}

