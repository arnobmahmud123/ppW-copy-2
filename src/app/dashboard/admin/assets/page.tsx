"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Boxes, ImageIcon, Truck } from "lucide-react"

type AssetsPayload = {
  overview: {
    trackedProperties: number
    assetFamilies: number
    logisticsWatchItems: number
    inspectionReadyProperties: number
  }
  topAssetFamilies: Array<{ type: string; count: number }>
  propertyRows: Array<{
    id: string
    workOrderNumber: string
    property: string
    serviceType: string
    status: string
    assetCount: number
    inspectionPhotoCount: number
    imageUrl: string | null
    logisticsFlags: string[]
  }>
  logisticsRows: Array<{
    workOrderId: string
    workOrderNumber: string
    property: string
    serviceType: string
    contractor: string
    dueDate: string | null
    deliverySignals: string[]
  }>
}

export default function AdminAssetsPage() {
  const [data, setData] = useState<AssetsPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/admin/assets-insights")
        if (response.ok) {
          setData(await response.json())
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-[#7280ad]">Loading assets and logistics…</div>
  }

  if (!data) {
    return <div className="rounded-[24px] border border-[#ecdfff] bg-white/90 p-6 text-sm text-[#7280ad]">Unable to load asset and logistics insights.</div>
  }

  return (
    <div className="space-y-6 text-[#435072]">
      <div className="rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-6 shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#eadfff] bg-[#f7f2ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a78cb]">
              <Boxes className="h-3.5 w-3.5" />
              Assets & Logistics
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-[#26324f]">Property asset registry and supply-chain view</h1>
            <p className="mt-2 max-w-4xl text-sm text-[#7280ad]">
              Track what asset families appear across properties, which jobs imply incoming materials or deliveries, and where inspection/photo readiness still needs work.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Tracked properties", data.overview.trackedProperties],
              ["Asset families", data.overview.assetFamilies],
              ["Logistics watch", data.overview.logisticsWatchItems],
              ["Inspection ready", data.overview.inspectionReadyProperties],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[22px] border border-[#ece5ff] bg-white/85 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#95a5cb]">{label}</div>
                <div className="mt-1 text-2xl font-semibold text-[#26324f]">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.7fr,1.3fr]">
        <section className="rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-6 shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          <h2 className="text-xl font-semibold text-[#26324f]">Top asset families</h2>
          <div className="mt-4 space-y-3">
            {data.topAssetFamilies.map((family) => (
              <div key={family.type} className="flex items-center justify-between rounded-[20px] border border-[#ece5ff] bg-white/85 px-4 py-3">
                <div className="text-sm font-medium text-[#435072]">{family.type}</div>
                <div className="rounded-full bg-[#f7f2ff] px-3 py-1 text-xs font-semibold text-[#8a78cb]">{family.count}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-6 shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          <h2 className="text-xl font-semibold text-[#26324f]">Property asset coverage</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.propertyRows.map((row) => (
              <div key={row.id} className="overflow-hidden rounded-[24px] border border-[#ece5ff] bg-white/85">
                <div className="relative h-40 bg-[linear-gradient(135deg,#f7f2ff_0%,#eef5ff_100%)]">
                  {row.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.imageUrl} alt={row.property} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#9eb0d4]">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <Link href={`/dashboard/admin/work-orders/${row.id}`} className="text-base font-semibold text-[#26324f] hover:text-[#7d58df]">
                    {row.workOrderNumber}
                  </Link>
                  <p className="mt-1 text-sm text-[#7280ad]">{row.property}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#5c688d]">
                    <span className="rounded-full bg-[#fbf9ff] px-3 py-1">{row.serviceType}</span>
                    <span className="rounded-full bg-[#fbf9ff] px-3 py-1">{row.assetCount} asset signals</span>
                    <span className="rounded-full bg-[#fbf9ff] px-3 py-1">{row.inspectionPhotoCount} inspection photos</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-6 shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#eef8ff_0%,#f8f0ff_100%)]">
            <Truck className="h-5 w-5 text-[#2f7cff]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#26324f]">Logistics watchlist</h2>
            <p className="mt-1 text-sm text-[#7280ad]">Supply and delivery signals inferred from active tasks and job comments.</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {data.logisticsRows.map((row) => (
            <div key={row.workOrderId} className="rounded-[22px] border border-[#ece5ff] bg-white/85 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/dashboard/admin/work-orders/${row.workOrderId}`} className="text-sm font-semibold text-[#26324f] hover:text-[#7d58df]">
                    {row.workOrderNumber}
                  </Link>
                  <div className="mt-1 text-sm text-[#7280ad]">{row.property}</div>
                  <div className="mt-1 text-xs text-[#95a5cb]">{row.contractor} · {row.serviceType}</div>
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a78cb]">
                  {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "No due date"}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.deliverySignals.map((signal) => (
                  <span key={signal} className="rounded-full bg-[#fbf9ff] px-3 py-1 text-xs text-[#5c688d]">{signal}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
