"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Building2,
  Camera,
  Clock3,
  FileText,
  Loader2,
  MapPin,
  Search,
} from "lucide-react"

import type { PropertyListItem } from "@/modules/properties/types"

function formatDate(value: string | null) {
  if (!value) return "No due date"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No due date"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<PropertyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    async function loadProperties() {
      try {
        setLoading(true)
        setError("")
        const response = await fetch("/api/admin/properties", {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error || "Unable to load properties")
        }

        const payload = await response.json()
        setProperties(Array.isArray(payload.properties) ? payload.properties : [])
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load properties")
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadProperties()
    return () => controller.abort()
  }, [])

  const filteredProperties = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return properties

    return properties.filter((property) => {
      const haystack = [
        property.addressLine1,
        property.addressLine2,
        property.city,
        property.state,
        property.postalCode,
        ...property.clients,
        ...property.contractors,
        ...property.serviceTypes,
        property.latestWorkOrder?.workOrderNumber,
        property.latestWorkOrder?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [properties, searchTerm])

  const totals = useMemo(() => {
    return filteredProperties.reduce(
      (acc, property) => {
        acc.properties += 1
        acc.open += property.openWorkOrders
        acc.overdue += property.overdueWorkOrders
        acc.invoiceReady += property.invoiceReadyWorkOrders
        return acc
      },
      { properties: 0, open: 0, overdue: 0, invoiceReady: 0 }
    )
  }, [filteredProperties])

  return (
    <div className="space-y-6 text-[#435072]">
      <div className="flex flex-col gap-4 rounded-[30px] border border-[#e3dcff] bg-[linear-gradient(135deg,#ffffff_0%,#f9f5ff_55%,#edf6ff_100%)] p-6 shadow-[0_22px_50px_rgba(193,184,244,0.18)] lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#eadfff] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#8a78cb]">
            <Building2 className="h-3.5 w-3.5" />
            Property command center
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#26324f]">Properties</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#7280ad]">
            See every property as an operational asset, open its full work order history, scan current risk, and jump
            straight into the address-level timeline and gallery.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Properties", value: totals.properties, tone: "text-[#7c63ff]" },
            { label: "Open WOs", value: totals.open, tone: "text-[#2f7cff]" },
            { label: "Overdue", value: totals.overdue, tone: "text-[#ff7a7a]" },
            { label: "Invoice Ready", value: totals.invoiceReady, tone: "text-[#a65cff]" },
          ].map((item) => (
            <div key={item.label} className="rounded-[22px] border border-[#ebe4ff] bg-white/85 px-4 py-3 shadow-[0_12px_28px_rgba(203,193,245,0.12)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8da1cf]">{item.label}</div>
              <div className={`mt-2 text-2xl font-semibold ${item.tone}`}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f9f7ff_100%)] p-4 shadow-[0_16px_36px_rgba(196,186,255,0.12)]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b97ba]" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by address, client, contractor, service type, or work order number…"
            className="w-full rounded-[22px] border border-[#e8e1ff] bg-[linear-gradient(180deg,#ffffff_0%,#f4f7ff_100%)] py-3 pl-11 pr-4 text-sm text-[#26324f] outline-none ring-0 placeholder:text-[#8b97ba]"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-[28px] border border-[#e9e3ff] bg-white/80 p-5">
              <div className="flex gap-4">
                <div className="h-24 w-32 rounded-[22px] bg-[#eef1ff]" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-1/3 rounded-full bg-[#eef1ff]" />
                  <div className="h-4 w-2/3 rounded-full bg-[#f2f4ff]" />
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 4 }).map((__, chipIndex) => (
                      <div key={chipIndex} className="h-14 rounded-2xl bg-[#f4f6ff]" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[28px] border border-[#ffc9c9] bg-[linear-gradient(180deg,#fff8f8_0%,#fff0f0_100%)] p-8 text-center shadow-[0_14px_28px_rgba(255,134,134,0.12)]">
          <AlertTriangle className="mx-auto h-10 w-10 text-[#ff7f7f]" />
          <h2 className="mt-4 text-xl font-semibold text-[#26324f]">Unable to load the property dashboard</h2>
          <p className="mt-2 text-sm text-[#7b6e93]">{error}</p>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="rounded-[28px] border border-[#ebe5ff] bg-[linear-gradient(180deg,#ffffff_0%,#faf8ff_100%)] p-10 text-center shadow-[0_14px_30px_rgba(196,186,255,0.12)]">
          <MapPin className="mx-auto h-10 w-10 text-[#a08be8]" />
          <h2 className="mt-4 text-xl font-semibold text-[#26324f]">No properties match this search</h2>
          <p className="mt-2 text-sm text-[#7280ad]">
            Try a different address, client, contractor, or service type to find the property you want.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredProperties.map((property) => (
            <Link
              key={property.propertyKey}
              href={`/dashboard/admin/properties/${property.propertyKey}`}
              className="group rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-5 shadow-[0_18px_40px_rgba(196,186,255,0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(180,167,239,0.2)]"
            >
              <div className="flex flex-col gap-5 xl:flex-row">
                <div className="overflow-hidden rounded-[24px] border border-[#ebe5ff] bg-[linear-gradient(180deg,#f5f8ff_0%,#fefcff_100%)] xl:w-[220px]">
                  {property.frontImageUrl ? (
                    <img
                      src={property.frontImageUrl}
                      alt={property.addressLine1}
                      className="h-[170px] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-[170px] items-center justify-center bg-[linear-gradient(135deg,#f7f2ff_0%,#eef5ff_100%)] text-[#93a2ca]">
                      <Building2 className="h-10 w-10" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#eee6ff] bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f7ed1]">
                          {property.city}, {property.state}
                        </span>
                        {property.overdueWorkOrders > 0 ? (
                          <span className="rounded-full border border-[#ffd9d9] bg-[#fff3f3] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e16464]">
                            {property.overdueWorkOrders} overdue
                          </span>
                        ) : null}
                      </div>
                      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#26324f]">{property.addressLine1}</h2>
                      <p className="mt-1 text-sm text-[#7280ad]">
                        {[property.addressLine2, `${property.city}, ${property.state} ${property.postalCode}`].filter(Boolean).join(" • ")}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-[#6c7aa1]">
                      {property.serviceTypes.slice(0, 3).map((serviceType) => (
                        <span key={serviceType} className="rounded-full border border-[#e9e2ff] bg-white/90 px-3 py-1.5 font-medium">
                          {serviceType.replaceAll("_", " ")}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {[
                      { icon: FileText, label: "Total WOs", value: property.totalWorkOrders, tone: "text-[#5e67ff]" },
                      { icon: Clock3, label: "Open", value: property.openWorkOrders, tone: "text-[#2f7cff]" },
                      { icon: AlertTriangle, label: "Overdue", value: property.overdueWorkOrders, tone: "text-[#ef6666]" },
                      { icon: Camera, label: "Photos", value: property.totalPhotos, tone: "text-[#8f66ff]" },
                      { icon: Loader2, label: "Invoice Ready", value: property.invoiceReadyWorkOrders, tone: "text-[#c35cff]" },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-[22px] border border-[#eee7ff] bg-white/85 px-4 py-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#90a0c8]">
                          <metric.icon className={`h-3.5 w-3.5 ${metric.tone}`} />
                          {metric.label}
                        </div>
                        <div className={`mt-2 text-2xl font-semibold ${metric.tone}`}>{metric.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-col gap-3 text-sm text-[#5f6f91] lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-4">
                      <span>
                        <strong className="font-semibold text-[#26324f]">Clients:</strong> {property.clients.join(", ") || "None"}
                      </span>
                      <span>
                        <strong className="font-semibold text-[#26324f]">Contractors:</strong> {property.contractors.join(", ") || "Unassigned"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <span>
                        <strong className="font-semibold text-[#26324f]">Next due:</strong> {formatDate(property.nextDueDate)}
                      </span>
                      <span>
                        <strong className="font-semibold text-[#26324f]">Latest WO:</strong>{" "}
                        {property.latestWorkOrder?.workOrderNumber || property.latestWorkOrder?.title || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
