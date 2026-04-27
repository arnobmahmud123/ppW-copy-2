import fs from "fs"
import path from "path"

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  fetchStreetViewImage,
  geocodeAddressLine,
  streetViewMetadata,
  STREET_VIEW_STATIC_MAX_SIZE,
} from "@/lib/maps/googleStreetImagery"
import { listPropertyStreetImageryTargets } from "@/modules/properties/streetImageryImport"

export const runtime = "nodejs"

const DEFAULT_HEADINGS = [0, 122, 244] as const

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type Body = {
  dryRun?: boolean
  limit?: number
  offset?: number
  /** Skip properties that already have any PHOTO_BEFORE (any work order at address) */
  skipExistingBefore?: boolean
  /** Compass headings for extra gallery shots (first is treated as primary “front”) */
  headings?: number[]
  /** Delay between Google API calls (ms) */
  throttleMs?: number
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GOOGLE_MAPS_API_KEY is not configured. Enable Geocoding, Street View Static API, and add the key to your environment.",
        },
        { status: 503 }
      )
    }

    let body: Body = {}
    try {
      body = (await request.json()) as Body
    } catch {
      body = {}
    }

    const dryRun = Boolean(body.dryRun)
    const skipExistingBefore = body.skipExistingBefore !== false
    const limit = Math.min(200, Math.max(1, Number(body.limit) || 30))
    const offset = Math.max(0, Number(body.offset) || 0)
    const throttleMs = Math.min(5000, Math.max(0, Number(body.throttleMs) ?? 120))
    const headings =
      Array.isArray(body.headings) && body.headings.length > 0
        ? body.headings.map((h) => Number(h)).filter((h) => Number.isFinite(h))
        : [...DEFAULT_HEADINGS]

    if (headings.length === 0) {
      return NextResponse.json({ error: "headings must include at least one value" }, { status: 400 })
    }

    const allTargets = await listPropertyStreetImageryTargets()
    const slice = allTargets.slice(offset, offset + limit)

    if (dryRun) {
      let wouldProcess = 0
      let wouldSkip = 0
      for (const target of slice) {
        if (skipExistingBefore && target.hasExistingBeforePhoto) wouldSkip += 1
        else wouldProcess += 1
      }
      return NextResponse.json({
        ok: true,
        dryRun: true,
        totalProperties: allTargets.length,
        batchSize: slice.length,
        offset,
        limit,
        wouldProcess,
        wouldSkip,
        headings: headings.length,
        note:
          "Dry run: no Google API calls. Run again with dryRun:false to import. Uses Google Street View at 640×640 (API maximum).",
      })
    }

    let processed = 0
    let skipped = 0
    let imagesCreated = 0
    const failures: { propertyKey: string; reason: string }[] = []

    for (const target of slice) {
      if (skipExistingBefore && target.hasExistingBeforePhoto) {
        skipped += 1
        continue
      }

      processed += 1

      let lat = target.gpsLat ?? undefined
      let lng = target.gpsLon ?? undefined

      if (lat === undefined || lng === undefined) {
        const geo = await geocodeAddressLine(
          {
            line1: target.addressLine1,
            city: target.city,
            state: target.state,
            postalCode: target.postalCode,
          },
          apiKey
        )
        if (throttleMs) await sleep(throttleMs)
        if (!geo) {
          failures.push({ propertyKey: target.propertyKey, reason: "Geocoding returned no results" })
          continue
        }
        lat = geo.lat
        lng = geo.lng
      }

      const meta = await streetViewMetadata(lat!, lng!, apiKey)
      if (throttleMs) await sleep(throttleMs)
      if (!meta) {
        failures.push({ propertyKey: target.propertyKey, reason: "No Street View coverage for this location" })
        continue
      }

      const snapLat = meta.lat
      const snapLng = meta.lng

      let createdForProperty = 0
      const headingFailures: string[] = []
      for (let i = 0; i < headings.length; i += 1) {
        const heading = ((headings[i]! % 360) + 360) % 360
        const category = i === 0 ? "PHOTO_BEFORE" : "PHOTO_DURING"

        const buffer = await fetchStreetViewImage({
          lat: snapLat,
          lng: snapLng,
          heading,
          apiKey,
          size: STREET_VIEW_STATIC_MAX_SIZE,
        })
        if (throttleMs) await sleep(throttleMs)

        if (!buffer) {
          headingFailures.push(`heading ${heading}`)
          continue
        }

        const uploadsDir = path.join(process.cwd(), "public", "uploads", target.workOrderId)
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true })
        }

        const filename = `street-view-${heading}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
        const filePath = path.join(uploadsDir, filename)
        fs.writeFileSync(filePath, buffer)

        const fileUrl = `/uploads/${target.workOrderId}/${filename}`
        const fileKey = `work-orders/${target.workOrderId}/${filename}`

        try {
          await db.fileAttachment.create({
            data: {
              url: fileUrl,
              key: fileKey,
              mimeType: "image/jpeg",
              category,
              workOrderId: target.workOrderId,
            },
          })
        } catch (dbErr: unknown) {
          const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
          failures.push({ propertyKey: target.propertyKey, reason: `Database save failed: ${msg}` })
          try {
            fs.unlinkSync(filePath)
          } catch {
            /* ignore */
          }
          break
        }

        createdForProperty += 1
        imagesCreated += 1
      }

      if (createdForProperty === 0) {
        failures.push({
          propertyKey: target.propertyKey,
          reason:
            headingFailures.length > 0
              ? `Street View fetch failed (${headingFailures.join(", ")})`
              : "No Street View images could be saved",
        })
      }
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      totalProperties: allTargets.length,
      batchSize: slice.length,
      offset,
      limit,
      processed,
      skipped,
      imagesCreated,
      failures,
      note:
        "Imagery is from Google Street View Static API at the largest supported size (640×640). Zillow and similar sites do not provide a licensed API for bulk listing photos.",
    })
  } catch (error) {
    console.error("import-street-imagery:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    )
  }
}
