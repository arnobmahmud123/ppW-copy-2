import fs from "fs"
import path from "path"

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { listPropertyStreetImageryTargets } from "@/modules/properties/streetImageryImport"

export const runtime = "nodejs"

const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const MAX_URLS_PER_PROPERTY = 24
const FETCH_TIMEOUT_MS = 45_000

type BodyItem = {
  propertyKey?: string
  workOrderId?: string
  imageUrls?: unknown
  /** If true and the property already has PHOTO_BEFORE, skip this item entirely (no downloads). */
  skipIfBeforeExists?: boolean
  /** If true, every URL is saved as PHOTO_DURING (gallery). Ignores front-of-house slot. */
  galleryOnly?: boolean
}

type Body = BodyItem & {
  /** Batch: multiple properties in one request. */
  items?: BodyItem[]
}

function normalizeUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const entry of raw) {
    if (typeof entry !== "string") continue
    const trimmed = entry.trim()
    if (trimmed) out.push(trimmed)
  }
  return [...new Set(out)]
}

function validateRemoteImageUrl(urlStr: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(urlStr)
  } catch {
    return "Invalid URL"
  }
  const allowedHttp = process.env.NODE_ENV !== "production" && parsed.protocol === "http:"
  if (parsed.protocol !== "https:" && !allowedHttp) {
    return "Only https image URLs are supported (http is allowed in non-production builds)"
  }
  const host = parsed.hostname.toLowerCase()
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "169.254.169.254"
  ) {
    return "That host is not allowed"
  }
  return null
}

function sniffImage(buffer: Buffer): { ext: string; mimeType: string } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", mimeType: "image/jpeg" }
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { ext: "png", mimeType: "image/png" }
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { ext: "webp", mimeType: "image/webp" }
  }
  if (buffer.length >= 6 && buffer.toString("ascii", 0, 6) === "GIF87a") {
    return { ext: "gif", mimeType: "image/gif" }
  }
  if (buffer.length >= 6 && buffer.toString("ascii", 0, 6) === "GIF89a") {
    return { ext: "gif", mimeType: "image/gif" }
  }
  return null
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; mimeType: string; ext: string } | null> {
  const bad = validateRemoteImageUrl(url)
  if (bad) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PropertyAdminPhotoImport/1.0)",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    })
    if (!res.ok) return null
    const len = res.headers.get("content-length")
    if (len && Number(len) > MAX_IMAGE_BYTES) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > MAX_IMAGE_BYTES) return null
    const sniffed = sniffImage(buf)
    if (!sniffed) return null
    return { buffer: buf, mimeType: sniffed.mimeType, ext: sniffed.ext }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function resolveWorkOrderId(item: BodyItem): Promise<{ workOrderId: string; hasBefore: boolean } | null> {
  if (item.workOrderId && typeof item.workOrderId === "string" && item.workOrderId.trim()) {
    const wo = await db.workOrder.findFirst({
      where: { id: item.workOrderId.trim() },
      select: {
        id: true,
        files: { where: { category: "PHOTO_BEFORE" }, select: { id: true }, take: 1 },
      },
    })
    if (!wo) return null
    return { workOrderId: wo.id, hasBefore: wo.files.length > 0 }
  }
  if (typeof item.propertyKey === "string") {
    const pk = item.propertyKey.trim()
    if (!pk) return null
    const targets = await listPropertyStreetImageryTargets()
    const target = targets.find((t) => t.propertyKey === pk)
    if (!target) return null
    return { workOrderId: target.workOrderId, hasBefore: target.hasExistingBeforePhoto }
  }
  return null
}

async function processOneItem(item: BodyItem): Promise<{
  propertyKey?: string
  workOrderId?: string
  created: number
  skipped: boolean
  errors: string[]
}> {
  const errors: string[] = []
  const imageUrls = normalizeUrls(item.imageUrls).slice(0, MAX_URLS_PER_PROPERTY)
  if (imageUrls.length === 0) {
    return { propertyKey: item.propertyKey, workOrderId: item.workOrderId, created: 0, skipped: false, errors: ["No image URLs"] }
  }

  const resolved = await resolveWorkOrderId(item)
  if (!resolved) {
    errors.push("Could not resolve work order (check propertyKey or workOrderId)")
    return { propertyKey: item.propertyKey, workOrderId: item.workOrderId, created: 0, skipped: false, errors }
  }

  /** When true, skip the whole property if it already has PHOTO_BEFORE (batch “fill gaps” mode). */
  const skipIfBefore = Boolean(item.skipIfBeforeExists)
  const galleryOnly = Boolean(item.galleryOnly)
  if (skipIfBefore && resolved.hasBefore && !galleryOnly) {
    return {
      propertyKey: item.propertyKey,
      workOrderId: resolved.workOrderId,
      created: 0,
      skipped: true,
      errors: [],
    }
  }

  let hasBefore = resolved.hasBefore
  let created = 0
  const uploadsDir = path.join(process.cwd(), "public", "uploads", resolved.workOrderId)
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  for (let i = 0; i < imageUrls.length; i += 1) {
    const url = imageUrls[i]!
    const urlErr = validateRemoteImageUrl(url)
    if (urlErr) {
      errors.push(`${url.slice(0, 80)}…: ${urlErr}`)
      continue
    }

    const downloaded = await downloadImage(url)
    if (!downloaded) {
      errors.push(`Download or decode failed: ${url.slice(0, 120)}${url.length > 120 ? "…" : ""}`)
      continue
    }

    let category: "PHOTO_BEFORE" | "PHOTO_DURING"
    if (galleryOnly) {
      category = "PHOTO_DURING"
    } else if (!hasBefore && i === 0) {
      category = "PHOTO_BEFORE"
      hasBefore = true
    } else {
      category = "PHOTO_DURING"
    }

    const filename = `listing-import-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${downloaded.ext}`
    const filePath = path.join(uploadsDir, filename)
    fs.writeFileSync(filePath, downloaded.buffer)
    const fileUrl = `/uploads/${resolved.workOrderId}/${filename}`
    const fileKey = `work-orders/${resolved.workOrderId}/${filename}`

    try {
      await db.fileAttachment.create({
        data: {
          url: fileUrl,
          key: fileKey,
          mimeType: downloaded.mimeType,
          category,
          workOrderId: resolved.workOrderId,
        },
      })
      created += 1
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
      errors.push(`Database save failed: ${msg}`)
      try {
        fs.unlinkSync(filePath)
      } catch {
        /* ignore */
      }
    }
  }

  return {
    propertyKey: item.propertyKey,
    workOrderId: resolved.workOrderId,
    created,
    skipped: false,
    errors,
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body: Body = {}
    try {
      body = (await request.json()) as Body
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const items: BodyItem[] = Array.isArray(body.items) && body.items.length > 0 ? body.items : [body]
    if (items.length > 50) {
      return NextResponse.json({ error: "At most 50 items per request" }, { status: 400 })
    }

    const results = []
    for (const item of items) {
      results.push(await processOneItem(item))
    }

    const totalCreated = results.reduce((s, r) => s + r.created, 0)
    return NextResponse.json({
      ok: true,
      totalCreated,
      results,
      note:
        "Images are fetched from the URLs you provide. Listing sites often use expiring or cookie-guarded URLs; save files locally or use stable direct links. You are responsible for rights to use each image.",
    })
  } catch (error) {
    console.error("import-listing-photo-urls:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    )
  }
}
