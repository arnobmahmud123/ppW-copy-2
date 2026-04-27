import "server-only"

/** Google Street View Static API maximum edge length (pixels). */
export const STREET_VIEW_STATIC_MAX_SIZE = 640

export type PanoramaSnap = {
  lat: number
  lng: number
  panoId?: string
}

/**
 * Snap to the nearest panorama (if any). Returns null when Street View has no coverage.
 * @see https://developers.google.com/maps/documentation/streetview/metadata
 */
export async function streetViewMetadata(
  lat: number,
  lng: number,
  apiKey: string
): Promise<PanoramaSnap | null> {
  const url =
    `https://maps.googleapis.com/maps/api/streetview/metadata` +
    `?location=${encodeURIComponent(`${lat},${lng}`)}` +
    `&key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as {
    status: string
    location?: { lat: number; lng: number }
    pano_id?: string
  }
  if (data.status !== "OK" || !data.location) return null
  return {
    lat: data.location.lat,
    lng: data.location.lng,
    panoId: data.pano_id,
  }
}

/**
 * Geocode a mailing-style address via Google Geocoding API.
 * @see https://developers.google.com/maps/documentation/geocoding/overview
 */
export async function geocodeAddressLine(
  parts: { line1: string; city: string; state: string; postalCode: string },
  apiKey: string
): Promise<{ lat: number; lng: number } | null> {
  const address = `${parts.line1}, ${parts.city}, ${parts.state} ${parts.postalCode}`
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?address=${encodeURIComponent(address)}` +
    `&key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as {
    status: string
    results?: { geometry?: { location?: { lat: number; lng: number } } }[]
  }
  if (data.status !== "OK" || !data.results?.length) return null
  const loc = data.results[0]?.geometry?.location
  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") return null
  return { lat: loc.lat, lng: loc.lng }
}

export type StreetViewHeadingShot = {
  heading: number
  buffer: Buffer
  mimeType: "image/jpeg"
}

/**
 * Fetch a Street View panorama image at maximum supported resolution.
 */
export async function fetchStreetViewImage(opts: {
  lat: number
  lng: number
  heading: number
  apiKey: string
  /** 1–640 inclusive per Google Street View Static API */
  size?: number
  pitch?: number
  fov?: number
}): Promise<Buffer | null> {
  const size = Math.min(STREET_VIEW_STATIC_MAX_SIZE, Math.max(1, opts.size ?? STREET_VIEW_STATIC_MAX_SIZE))
  const pitch = opts.pitch ?? 8
  const fov = opts.fov ?? 85
  const url =
    `https://maps.googleapis.com/maps/api/streetview` +
    `?size=${size}x${size}` +
    `&location=${encodeURIComponent(`${opts.lat},${opts.lng}`)}` +
    `&heading=${encodeURIComponent(String(opts.heading))}` +
    `&pitch=${encodeURIComponent(String(pitch))}` +
    `&fov=${encodeURIComponent(String(fov))}` +
    `&key=${encodeURIComponent(opts.apiKey)}`

  const res = await fetch(url)
  if (!res.ok) return null
  const mime = res.headers.get("content-type") || ""
  const buf = Buffer.from(await res.arrayBuffer())
  if (!buf.length || mime.includes("json")) return null
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8
  if (!jpeg && !mime.includes("image/")) return null
  return buf
}
