/**
 * Property identity + URL key — shared by admin work orders and property API.
 * Must match the encoding used in `getAdminPropertyDetail` (base64url of JSON of normalized address parts).
 */

export type PropertyAddressLike = {
  addressLine1: string
  city: string
  state: string
  postalCode: string
}

export function normalizePropertyPart(value: string | null | undefined): string {
  return (value || "").trim().replace(/\s+/g, " ").toLowerCase()
}

export function buildPropertyIdentityFromAddress(record: PropertyAddressLike): PropertyAddressLike {
  return {
    addressLine1: normalizePropertyPart(record.addressLine1),
    city: normalizePropertyPart(record.city),
    state: normalizePropertyPart(record.state),
    postalCode: normalizePropertyPart(record.postalCode),
  }
}

function utf8JsonToBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json)
  let binary = ""
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!)
  }
  if (typeof btoa === "function") {
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url")
  }
  throw new Error("No base64 encoder available")
}

export function buildPropertyKey(record: PropertyAddressLike): string {
  const identity = buildPropertyIdentityFromAddress(record)
  return utf8JsonToBase64Url(JSON.stringify(identity))
}
