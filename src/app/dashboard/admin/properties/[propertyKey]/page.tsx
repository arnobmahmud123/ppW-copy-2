"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Camera,
  Clock3,
  DollarSign,
  FileText,
  MapPin,
  MessageSquare,
  Sparkles,
} from "lucide-react"

import type { PropertyDetailResponse } from "@/modules/properties/types"

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown time"
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const timelineTone: Record<string, string> = {
  WORK_ORDER: "bg-[#eef4ff] text-[#4068c9]",
  ASSIGNMENT: "bg-[#eefcf5] text-[#2f9b67]",
  FIELD_COMPLETE: "bg-[#f4f1ff] text-[#7d58df]",
  INVOICE: "bg-[#fff4eb] text-[#d46f2f]",
  MESSAGE: "bg-[#fff2fa] text-[#cb5aa2]",
}

export default function AdminPropertyDetailPage() {
  const params = useParams<{ propertyKey: string }>()
  const propertyKey = Array.isArray(params?.propertyKey) ? params.propertyKey[0] : params?.propertyKey
  const [data, setData] = useState<PropertyDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!propertyKey) return

    const controller = new AbortController()

    async function loadProperty() {
      try {
        setLoading(true)
        setError("")
        const response = await fetch(`/api/admin/properties/${propertyKey}`, {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error || "Unable to load this property")
        }

        const payload = await response.json()
        setData(payload)
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load this property")
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadProperty()
    return () => controller.abort()
  }, [propertyKey])

  const headline = useMemo(() => {
    if (!data) return ""
    return [
      data.property.addressLine1,
      data.property.addressLine2,
      `${data.property.city}, ${data.property.state} ${data.property.postalCode}`,
    ]
      .filter(Boolean)
      .join(" • ")
  }, [data])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse rounded-[30px] border border-[#e9e3ff] bg-white/80 p-6">
          <div className="h-6 w-40 rounded-full bg-[#eef1ff]" />
          <div className="mt-4 h-10 w-2/3 rounded-full bg-[#f3f5ff]" />
          <div className="mt-3 h-5 w-1/2 rounded-full bg-[#f6f7ff]" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="h-[320px] animate-pulse rounded-[28px] bg-[#eef1ff]" />
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-[24px] bg-[#f3f5ff]" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-[30px] border border-[#ffd7d7] bg-[linear-gradient(180deg,#fff8f8_0%,#fff1f1_100%)] p-10 text-center shadow-[0_14px_30px_rgba(255,140,140,0.12)]">
        <AlertTriangle className="mx-auto h-10 w-10 text-[#ff7f7f]" />
        <h1 className="mt-4 text-2xl font-semibold text-[#26324f]">Property view unavailable</h1>
        <p className="mt-2 text-sm text-[#7b6e93]">{error || "This property could not be loaded."}</p>
        <Link
          href="/dashboard/admin/properties"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#eadfff] bg-white px-4 py-2 text-sm font-medium text-[#6d58c9]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to properties
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-[#435072]">
      <div className="rounded-[30px] border border-[#e3dcff] bg-[linear-gradient(135deg,#ffffff_0%,#f8f4ff_56%,#eef6ff_100%)] p-6 shadow-[0_22px_50px_rgba(193,184,244,0.18)]">
        <Link
          href="/dashboard/admin/properties"
          className="inline-flex items-center gap-2 rounded-full border border-[#eadfff] bg-white/90 px-4 py-2 text-sm font-medium text-[#6d58c9]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to properties
        </Link>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#efe8ff] bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#917fd4]">
              <Building2 className="h-3.5 w-3.5" />
              Property master
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#26324f]">{data.property.addressLine1}</h1>
            <p className="mt-2 text-sm text-[#7280ad]">{headline}</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#f3f6ff] px-3 py-1.5 text-sm text-[#5f6f91]">
              <Clock3 className="h-4 w-4 text-[#8797bf]" />
              Latest activity {formatDateTime(data.property.latestUpdateAt)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Open", value: data.summary.openWorkOrders, tone: "text-[#2f7cff]" },
              { label: "Overdue", value: data.summary.overdueWorkOrders, tone: "text-[#e16464]" },
              { label: "Invoices", value: data.summary.totalInvoices, tone: "text-[#b45cff]" },
              { label: "Photos", value: data.summary.totalPhotos, tone: "text-[#6f63ff]" },
            ].map((item) => (
              <div key={item.label} className="rounded-[22px] border border-[#ece5ff] bg-white/85 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#91a1c8]">{item.label}</div>
                <div className={`mt-2 text-2xl font-semibold ${item.tone}`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <section className="overflow-hidden rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          <div className="border-b border-[#eee7ff] px-6 py-5">
            <h2 className="text-xl font-semibold text-[#26324f]">Front image + gallery</h2>
            <p className="mt-1 text-sm text-[#7280ad]">The latest visual record across every work order tied to this property.</p>
          </div>

          <div className="p-6">
            <div className="overflow-hidden rounded-[26px] border border-[#ebe5ff] bg-[linear-gradient(135deg,#f6f3ff_0%,#eef5ff_100%)]">
              {data.property.frontImageUrl ? (
                <img src={data.property.frontImageUrl} alt={data.property.addressLine1} className="h-[360px] w-full object-cover" />
              ) : (
                <div className="flex h-[360px] items-center justify-center text-[#92a1c8]">
                  <Building2 className="h-14 w-14" />
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.gallery.slice(0, 9).map((image) => (
                <div key={image.id} className="overflow-hidden rounded-[22px] border border-[#ece6ff] bg-white shadow-[0_12px_24px_rgba(196,186,255,0.1)]">
                  <img src={image.url} alt={image.workOrderNumber || image.id} className="h-36 w-full object-cover" />
                  <div className="px-3 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a84dd]">{image.category.replaceAll("_", " ")}</div>
                    <div className="mt-1 text-sm font-medium text-[#26324f]">{image.workOrderNumber || "Linked work order"}</div>
                    <div className="mt-1 text-xs text-[#7e8cb3]">{formatDateTime(image.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {[
            { icon: FileText, label: "Total work orders", value: data.summary.totalWorkOrders.toString(), tone: "text-[#6f63ff]" },
            { icon: Sparkles, label: "Invoice ready", value: data.summary.invoiceReadyWorkOrders.toString(), tone: "text-[#b45cff]" },
            { icon: DollarSign, label: "Billed value", value: formatMoney(data.summary.totalInvoiceAmount), tone: "text-[#ef7b49]" },
            { icon: Camera, label: "Photo volume", value: `${data.summary.totalPhotos} files`, tone: "text-[#2f7cff]" },
          ].map((item) => (
            <div key={item.label} className="rounded-[24px] border border-[#e6dfff] bg-[linear-gradient(180deg,#ffffff_0%,#f9f6ff_100%)] p-5 shadow-[0_16px_34px_rgba(196,186,255,0.12)]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fff9fe_0%,#eef4ff_100%)]">
                  <item.icon className={`h-5 w-5 ${item.tone}`} />
                </div>
                <div>
                  <div className="text-sm font-medium text-[#7a86b3]">{item.label}</div>
                  <div className={`mt-1 text-2xl font-semibold ${item.tone}`}>{item.value}</div>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <section className="rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#f9f6ff_100%)] shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          <div className="border-b border-[#eee7ff] px-6 py-5">
            <h2 className="text-xl font-semibold text-[#26324f]">Property timeline</h2>
            <p className="mt-1 text-sm text-[#7280ad]">Every major work-order, invoice, assignment, and message event in one stream.</p>
          </div>

          <div className="max-h-[780px] overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              {data.timeline.map((event) => (
                <div key={event.id} className="relative pl-6">
                  <div className="absolute left-0 top-2 h-3 w-3 rounded-full bg-[#d9ceff]" />
                  <div className="absolute left-[5px] top-5 bottom-[-18px] w-px bg-[#ece6ff]" />
                  <div className="rounded-[22px] border border-[#ece6ff] bg-white/90 p-4 shadow-[0_10px_22px_rgba(196,186,255,0.08)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${timelineTone[event.type] || "bg-[#eef1ff] text-[#5f6f91]"}`}>
                        {event.type.replaceAll("_", " ")}
                      </span>
                      <span className="text-xs text-[#8594bb]">{formatDateTime(event.at)}</span>
                    </div>
                    <div className="mt-3 text-base font-semibold text-[#26324f]">{event.title}</div>
                    <p className="mt-1 text-sm text-[#607094]">{event.description}</p>
                    <Link
                      href={`/dashboard/admin/work-orders/${event.workOrderId}`}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#745ae0]"
                    >
                      Open {event.workOrderNumber || "work order"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#f9f6ff_100%)] shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          <div className="border-b border-[#eee7ff] px-6 py-5">
            <h2 className="text-xl font-semibold text-[#26324f]">Work order history</h2>
            <p className="mt-1 text-sm text-[#7280ad]">Every work order at this property, with assignment, billing, and communication context.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#eee7ff]">
              <thead className="bg-[linear-gradient(180deg,#f8f5ff_0%,#eef4ff_100%)] text-left text-xs uppercase tracking-[0.18em] text-[#8ca0ca]">
                <tr>
                  <th className="px-5 py-4">Work Order</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Assignment</th>
                  <th className="px-5 py-4">Dates</th>
                  <th className="px-5 py-4">Counts</th>
                  <th className="px-5 py-4">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0eaff] text-sm text-[#4d5c80]">
                {data.workOrders.map((workOrder) => (
                  <tr key={workOrder.id} className="align-top hover:bg-[rgba(247,243,255,0.65)]">
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/admin/work-orders/${workOrder.id}`} className="font-semibold text-[#26324f] hover:text-[#6f56dc]">
                        {workOrder.workOrderNumber || workOrder.title}
                      </Link>
                      <div className="mt-1 text-xs text-[#7b89b1]">{workOrder.title}</div>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#f4f7ff] px-2.5 py-1 text-[11px] font-medium text-[#607094]">
                        <MapPin className="h-3 w-3" />
                        {workOrder.serviceType.replaceAll("_", " ")}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full border border-[#ece6ff] bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#755ee0]">
                        {workOrder.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div><strong className="text-[#26324f]">Client:</strong> {workOrder.clientName}</div>
                      <div className="mt-1"><strong className="text-[#26324f]">Contractor:</strong> {workOrder.contractorName || "Unassigned"}</div>
                      <div className="mt-1"><strong className="text-[#26324f]">Coordinator:</strong> {workOrder.coordinatorName || "—"}</div>
                      <div className="mt-1"><strong className="text-[#26324f]">Processor:</strong> {workOrder.processorName || "—"}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div><strong className="text-[#26324f]">Due:</strong> {formatDate(workOrder.dueDate)}</div>
                      <div className="mt-1"><strong className="text-[#26324f]">Field complete:</strong> {formatDate(workOrder.fieldComplete)}</div>
                      <div className="mt-1"><strong className="text-[#26324f]">Updated:</strong> {formatDateTime(workOrder.updatedAt)}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-2 rounded-full bg-[#f4f7ff] px-3 py-1 text-xs font-medium text-[#5f6f91]">
                        <Camera className="h-3.5 w-3.5 text-[#6f63ff]" />
                        {workOrder.photoCount}
                      </div>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#fff5fb] px-3 py-1 text-xs font-medium text-[#8c5f91]">
                        <MessageSquare className="h-3.5 w-3.5 text-[#cb5aa2]" />
                        {workOrder.messageCount}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div><strong className="text-[#26324f]">Status:</strong> {workOrder.invoiceStatus || "No invoice"}</div>
                      <div className="mt-1"><strong className="text-[#26324f]">Amount:</strong> {workOrder.invoiceAmount !== null ? formatMoney(workOrder.invoiceAmount) : "—"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
