import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { listPropertyStreetImageryTargets } from "@/modules/properties/streetImageryImport"

export const runtime = "nodejs"
export const maxDuration = 300

const FETCH_TIMEOUT_MS = 20_000
const MAX_PHOTOS_PER_PROPERTY = 4

// Rotate user agents to reduce scraping detection
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
]

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ───────────────────────── Image URL validation ─────────────────────────────

/**
 * Verify a URL actually serves an image by doing a HEAD (or small GET) request.
 * Returns the content-type if it looks like an image, or null otherwise.
 */
async function probeImageUrl(url: string): Promise<{ mimeType: string } | null> {
  try {
    const parsed = new URL(url)
    if (!["http:", "https:"].includes(parsed.protocol)) return null
    const host = parsed.hostname.toLowerCase()
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1", "169.254.169.254"].includes(host)) return null
  } catch {
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    // Try HEAD first to avoid downloading the full image
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": randomUA(),
        Accept: "image/*,*/*;q=0.8",
        Referer: "https://www.bing.com/",
      },
    })
    if (!res.ok) return null
    const ct = res.headers.get("content-type")?.toLowerCase() ?? ""
    if (ct.includes("image/")) {
      return { mimeType: ct.split(";")[0]!.trim() }
    }
    // Some servers don't return proper content-type on HEAD; check extension
    const ext = url.split("?")[0]?.split(".").pop()?.toLowerCase()
    if (ext && ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
      const guessedMime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/gif"
      return { mimeType: guessedMime }
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ───────────────────────── Bing Image scraping ──────────────────────────────

/**
 * Scrape Bing Images for an address query, returning direct image URLs.
 * We parse the `murl` parameter from Bing's result anchors / metadata,
 * which contains the full-size image URL.
 */
async function scrapeBingImages(query: string): Promise<string[]> {
  const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1&count=12&qft=+filterui:photo-photo`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": randomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.bing.com/",
      },
    })
    if (!res.ok) return []
    const html = await res.text()

    // Extract murl (media URL) values — these are the full resolution image URLs
    // Bing encodes them in the page in a JSON-like attribute: "murl":"https://..."
    const murlPattern = /"murl"\s*:\s*"(https?:\/\/[^"]+)"/g
    const urls: string[] = []
    const seen = new Set<string>()
    let match: RegExpExecArray | null
    while ((match = murlPattern.exec(html)) !== null) {
      const rawUrl = match[1]!
        .replace(/\\u002f/gi, "/")
        .replace(/\\u0026/gi, "&")
        .replace(/\\\//g, "/")
      if (seen.has(rawUrl)) continue
      seen.add(rawUrl)
      // Skip obviously irrelevant sources
      if (rawUrl.includes("logo") || rawUrl.includes("icon") || rawUrl.includes("avatar")) continue
      urls.push(rawUrl)
      if (urls.length >= 8) break
    }

    // Fallback: try to grab data-src or src from img tags with reasonable URLs
    if (urls.length === 0) {
      const imgSrcPattern = /(?:data-src|src)\s*=\s*"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi
      while ((match = imgSrcPattern.exec(html)) !== null) {
        const rawUrl = match[1]!
        if (seen.has(rawUrl)) continue
        seen.add(rawUrl)
        if (rawUrl.includes("logo") || rawUrl.includes("icon") || rawUrl.includes("avatar")) continue
        if (rawUrl.includes("bing.com/th") || rawUrl.includes("bing.net")) continue // skip Bing thumbnails
        urls.push(rawUrl)
        if (urls.length >= 6) break
      }
    }

    return urls
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

// ───────────────────────── Zillow fallback ───────────────────────────────────

async function scrapeZillowImages(address: string, city: string, state: string): Promise<string[]> {
  const query = `${address} ${city} ${state}`
  const searchUrl = `https://www.zillow.com/homes/${encodeURIComponent(query)}_rb/`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": randomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.google.com/",
      },
    })
    if (!res.ok) return []
    const html = await res.text()

    // Zillow embeds listing photos as JSON in the page
    const urls: string[] = []
    const seen = new Set<string>()

    // Look for image URLs in Zillow's page data
    const zillowImgPattern = /https?:\/\/(?:photos|images)\.zillowstatic\.com\/[^"'\s\\]+\.(?:jpg|jpeg|webp|png)/gi
    let match: RegExpExecArray | null
    while ((match = zillowImgPattern.exec(html)) !== null) {
      let rawUrl = match[0]!
      // Remove any trailing backslash artifacts
      rawUrl = rawUrl.replace(/\\+$/, "")
      if (seen.has(rawUrl)) continue
      seen.add(rawUrl)
      urls.push(rawUrl)
      if (urls.length >= 6) break
    }

    return urls
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

// ───────────────────────── Single property processor ────────────────────────

type PropertyTarget = {
  propertyKey: string
  workOrderId: string
  addressLine1: string
  city: string
  state: string
  postalCode: string
  gpsLat: number | null
  gpsLon: number | null
  hasExistingBeforePhoto: boolean
}

async function processOneProperty(
  target: PropertyTarget,
  throttleMs: number
): Promise<{
  propertyKey: string
  workOrderId: string
  address: string
  created: number
  skipped: boolean
  source: string
  errors: string[]
}> {
  const address = `${target.addressLine1}, ${target.city}, ${target.state} ${target.postalCode}`
  const errors: string[] = []

  // Build search query emphasizing it's a house/property
  const query = `${target.addressLine1} ${target.city} ${target.state} ${target.postalCode} house exterior`

  // 1. Try Bing Images first
  let imageUrls = await scrapeBingImages(query)
  let source = "bing"

  if (throttleMs) await sleep(throttleMs)

  // 2. Fallback to Zillow
  if (imageUrls.length === 0) {
    imageUrls = await scrapeZillowImages(target.addressLine1, target.city, target.state)
    source = "zillow"
    if (throttleMs) await sleep(throttleMs)
  }

  if (imageUrls.length === 0) {
    errors.push(`No images found for "${address}" from Bing or Zillow`)
    return { propertyKey: target.propertyKey, workOrderId: target.workOrderId, address, created: 0, skipped: false, source: "none", errors }
  }

  // Validate and save image URLs directly (no filesystem writes — Vercel compatible)
  let created = 0
  let hasBefore = target.hasExistingBeforePhoto

  for (let i = 0; i < imageUrls.length && created < MAX_PHOTOS_PER_PROPERTY; i++) {
    const imgUrl = imageUrls[i]!

    // Verify the URL actually serves an image
    const probed = await probeImageUrl(imgUrl)
    if (!probed) {
      errors.push(`Not a valid image: ${imgUrl.slice(0, 100)}${imgUrl.length > 100 ? "…" : ""}`)
      continue
    }

    // First successful image becomes PHOTO_BEFORE if none exists; rest are PHOTO_DURING (gallery)
    let category: "PHOTO_BEFORE" | "PHOTO_DURING"
    if (!hasBefore && created === 0) {
      category = "PHOTO_BEFORE"
      hasBefore = true
    } else {
      category = "PHOTO_DURING"
    }

    const fileKey = `auto-scrape/${target.workOrderId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    try {
      await db.fileAttachment.create({
        data: {
          url: imgUrl,
          key: fileKey,
          mimeType: probed.mimeType,
          category,
          workOrderId: target.workOrderId,
        },
      })
      created += 1
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
      errors.push(`DB save failed: ${msg}`)
    }

    // Small delay between probes
    if (i < imageUrls.length - 1) await sleep(300)
  }

  return { propertyKey: target.propertyKey, workOrderId: target.workOrderId, address, created, skipped: false, source, errors }
}

// ───────────────────────── Route handler ─────────────────────────────────────

type Body = {
  dryRun?: boolean
  limit?: number
  offset?: number
  skipExistingBefore?: boolean
  throttleMs?: number
  /** If provided, only process this single property key */
  propertyKey?: string
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
      body = {}
    }

    const dryRun = Boolean(body.dryRun)
    const skipExistingBefore = body.skipExistingBefore !== false
    const limit = Math.min(200, Math.max(1, Number(body.limit) || 30))
    const offset = Math.max(0, Number(body.offset) || 0)
    const throttleMs = Math.min(10_000, Math.max(500, Number(body.throttleMs) ?? 2000))

    const allTargets = await listPropertyStreetImageryTargets()

    // Single-property mode
    if (typeof body.propertyKey === "string" && body.propertyKey.trim()) {
      const target = allTargets.find((t) => t.propertyKey === body.propertyKey!.trim())
      if (!target) {
        return NextResponse.json({ error: "Property not found" }, { status: 404 })
      }

      if (dryRun) {
        return NextResponse.json({
          ok: true,
          dryRun: true,
          totalProperties: 1,
          wouldProcess: skipExistingBefore && target.hasExistingBeforePhoto ? 0 : 1,
          wouldSkip: skipExistingBefore && target.hasExistingBeforePhoto ? 1 : 0,
          note: "Dry run for single property. Set dryRun:false to scrape.",
        })
      }

      if (skipExistingBefore && target.hasExistingBeforePhoto) {
        return NextResponse.json({
          ok: true,
          totalProperties: 1,
          processed: 0,
          skipped: 1,
          imagesCreated: 0,
          results: [],
          note: "Property already has a before photo and skipExistingBefore is set.",
        })
      }

      const result = await processOneProperty(target, throttleMs)
      return NextResponse.json({
        ok: true,
        totalProperties: 1,
        processed: 1,
        skipped: 0,
        imagesCreated: result.created,
        results: [result],
        note: "Image URLs from public web search are stored directly. You are responsible for rights to use each image.",
      })
    }

    // Batch mode
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
        note: "Dry run: no scraping performed. Run again with dryRun:false to import. Photos are scraped from Bing Images and Zillow (no API keys required).",
      })
    }

    let processed = 0
    let skipped = 0
    let imagesCreated = 0
    const results: Awaited<ReturnType<typeof processOneProperty>>[] = []
    const failures: { propertyKey: string; reason: string }[] = []

    for (const target of slice) {
      if (skipExistingBefore && target.hasExistingBeforePhoto) {
        skipped += 1
        continue
      }

      processed += 1
      const result = await processOneProperty(target, throttleMs)
      results.push(result)
      imagesCreated += result.created

      if (result.created === 0 && result.errors.length > 0) {
        failures.push({ propertyKey: target.propertyKey, reason: result.errors[0] ?? "Unknown error" })
      }

      // Throttle between properties
      if (throttleMs) await sleep(throttleMs)
    }

    return NextResponse.json({
      ok: true,
      dryRun: false,
      totalProperties: allTargets.length,
      batchSize: slice.length,
      offset,
      limit,
      processed,
      skipped,
      imagesCreated,
      failures: failures.slice(0, 20),
      note: "Image URLs from public web search (Bing Images / Zillow) are stored directly. No files are written to disk. You are responsible for rights to use each image.",
    })
  } catch (error) {
    console.error("auto-scrape-photos:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scrape failed" },
      { status: 500 }
    )
  }
}
