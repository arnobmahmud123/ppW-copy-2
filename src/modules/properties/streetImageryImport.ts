import "server-only"

import { db } from "@/lib/db"
import { buildPropertyKey } from "@/modules/properties/propertyKey"

export type PropertyStreetImageryTarget = {
  propertyKey: string
  workOrderId: string
  addressLine1: string
  city: string
  state: string
  postalCode: string
  gpsLat: number | null
  gpsLon: number | null
  /** Any work order at this address already has a PHOTO_BEFORE attachment */
  hasExistingBeforePhoto: boolean
}

/**
 * One row per distinct property (address aggregate), using the latest-updated work order as the attachment anchor.
 */
export async function listPropertyStreetImageryTargets(): Promise<PropertyStreetImageryTarget[]> {
  const [workOrderRows, beforeRows] = await Promise.all([
    db.workOrder.findMany({
      select: {
        id: true,
        addressLine1: true,
        city: true,
        state: true,
        postalCode: true,
        gpsLat: true,
        gpsLon: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    }),
    db.fileAttachment.findMany({
      where: { category: "PHOTO_BEFORE" },
      select: {
        workOrder: {
          select: {
            addressLine1: true,
            city: true,
            state: true,
            postalCode: true,
          },
        },
      },
    }),
  ])

  const propertyKeysWithBefore = new Set(
    beforeRows.map((row) => buildPropertyKey(row.workOrder))
  )

  const byKey = new Map<string, PropertyStreetImageryTarget>()
  for (const row of workOrderRows) {
    const propertyKey = buildPropertyKey(row)
    if (byKey.has(propertyKey)) continue
    byKey.set(propertyKey, {
      propertyKey,
      workOrderId: row.id,
      addressLine1: row.addressLine1,
      city: row.city,
      state: row.state,
      postalCode: row.postalCode,
      gpsLat: row.gpsLat ?? null,
      gpsLon: row.gpsLon ?? null,
      hasExistingBeforePhoto: propertyKeysWithBefore.has(propertyKey),
    })
  }

  return Array.from(byKey.values())
}
