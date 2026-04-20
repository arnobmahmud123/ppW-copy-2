"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Clock3,
  Mail,
  Phone,
  Search,
  Sparkles,
  Users,
} from "lucide-react"

import type { CoordinatorConsoleItem, CoordinatorConsoleSummary } from "@/modules/workforce/types"

function formatDateTime(value: string | null) {
  if (!value) return "No recent activity"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No recent activity"
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export default function AdminCoordinatorsPage() {
  const [coordinators, setCoordinators] = useState<CoordinatorConsoleItem[]>([])
  const [summary, setSummary] = useState<CoordinatorConsoleSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    async function loadConsole() {
      try {
        setLoading(true)
        setError("")
        const response = await fetch(`/api/admin/coordinators?ts=${Date.now()}`, {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error || "Unable to load coordinators")
        }

        const payload = await response.json()
        setCoordinators(Array.isArray(payload.coordinators) ? payload.coordinators : [])
        setSummary(payload.summary ?? null)
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load coordinators")
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadConsole()
    return () => controller.abort()
  }, [])

  const filteredCoordinators = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return coordinators

    return coordinators.filter((coordinator) =>
      [
        coordinator.name,
        coordinator.email,
        coordinator.phone,
        coordinator.company,
        ...coordinator.serviceTypes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  }, [coordinators, searchTerm])

  return (
    <div className="space-y-6 text-[#435072]">
      <div className="flex flex-col gap-4 rounded-[30px] border border-[#e3dcff] bg-[linear-gradient(135deg,#ffffff_0%,#f8f4ff_52%,#eef6ff_100%)] p-6 shadow-[0_22px_50px_rgba(193,184,244,0.18)] lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#eadfff] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#8a78cb]">
            <Users className="h-3.5 w-3.5" />
            Coordinator workload console
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#26324f]">Coordinators</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#7280ad]">
            Track each coordinator&apos;s workload, overdue risk, invoice-ready queue, property coverage, and the exact work
            orders currently sitting with them.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Coordinators", value: summary?.totalCoordinators ?? 0, tone: "text-[#7c63ff]" },
            { label: "Active", value: summary?.activeCoordinators ?? 0, tone: "text-[#2f7cff]" },
            { label: "Open WOs", value: summary?.totalOpenWorkOrders ?? 0, tone: "text-[#5c70ff]" },
            { label: "Invoice Ready", value: summary?.totalInvoiceReadyWorkOrders ?? 0, tone: "text-[#c35cff]" },
          ].map((item) => (
            <div key={item.label} className="rounded-[22px] border border-[#ece5ff] bg-white/85 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8da1cf]">{item.label}</div>
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
            placeholder="Search coordinators by name, email, phone, company, or service mix..."
            className="w-full rounded-[22px] border border-[#e8e1ff] bg-[linear-gradient(180deg,#ffffff_0%,#f4f7ff_100%)] py-3 pl-11 pr-4 text-sm text-[#26324f] outline-none placeholder:text-[#8b97ba]"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-[28px] border border-[#e9e3ff] bg-white/80 p-6">
              <div className="h-6 w-40 rounded-full bg-[#eef1ff]" />
              <div className="mt-5 grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((__, metricIndex) => (
                  <div key={metricIndex} className="h-20 rounded-[22px] bg-[#f4f6ff]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[28px] border border-[#ffd0d0] bg-[linear-gradient(180deg,#fff8f8_0%,#fff2f2_100%)] p-10 text-center shadow-[0_14px_30px_rgba(255,140,140,0.12)]">
          <AlertTriangle className="mx-auto h-10 w-10 text-[#ff7f7f]" />
          <h2 className="mt-4 text-xl font-semibold text-[#26324f]">Coordinator console unavailable</h2>
          <p className="mt-2 text-sm text-[#7b6e93]">{error}</p>
        </div>
      ) : filteredCoordinators.length === 0 ? (
        <div className="rounded-[28px] border border-[#ebe5ff] bg-[linear-gradient(180deg,#ffffff_0%,#faf8ff_100%)] p-10 text-center shadow-[0_14px_30px_rgba(196,186,255,0.12)]">
          <Users className="mx-auto h-10 w-10 text-[#9a8ddd]" />
          <h2 className="mt-4 text-xl font-semibold text-[#26324f]">No coordinators match this search</h2>
          <p className="mt-2 text-sm text-[#7280ad]">Try a different name, email, phone number, or service type.</p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredCoordinators.map((coordinator) => (
            <div
              key={coordinator.id}
              className="rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-6 shadow-[0_18px_40px_rgba(196,186,255,0.14)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  {coordinator.avatarUrl ? (
                    <img
                      src={coordinator.avatarUrl}
                      alt={coordinator.name}
                      className="h-16 w-16 rounded-2xl object-cover shadow-[0_12px_26px_rgba(191,180,246,0.18)]"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fff3fb_0%,#edf4ff_100%)] text-lg font-semibold text-[#765ee0] shadow-[0_12px_26px_rgba(191,180,246,0.16)]">
                      {initialsFromName(coordinator.name)}
                    </div>
                  )}

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold tracking-tight text-[#26324f]">{coordinator.name}</h2>
                      <span className="rounded-full border border-[#ece6ff] bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7ad5]">
                        Coordinator
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#7280ad]">{coordinator.company || "Operations team"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={`mailto:${coordinator.email}`}
                        className="inline-flex items-center gap-2 rounded-full border border-[#e9e2ff] bg-white px-3 py-1.5 text-sm font-medium text-[#5f6f91]"
                      >
                        <Mail className="h-4 w-4 text-[#7c63ff]" />
                        Email
                      </a>
                      {coordinator.phone ? (
                        <a
                          href={`tel:${coordinator.phone}`}
                          className="inline-flex items-center gap-2 rounded-full border border-[#e9e2ff] bg-white px-3 py-1.5 text-sm font-medium text-[#5f6f91]"
                        >
                          <Phone className="h-4 w-4 text-[#2f7cff]" />
                          Call
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#ece6ff] bg-white/85 px-4 py-3 text-sm text-[#5f6f91]">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8da1cf]">
                    <Clock3 className="h-3.5 w-3.5 text-[#a88be8]" />
                    Latest activity
                  </div>
                  <div className="mt-2 font-medium text-[#26324f]">{formatDateTime(coordinator.latestActivityAt)}</div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Open", value: coordinator.openWorkOrders, tone: "text-[#2f7cff]" },
                  { label: "Overdue", value: coordinator.overdueWorkOrders, tone: "text-[#e16464]" },
                  { label: "Field Complete", value: coordinator.fieldCompleteQueue, tone: "text-[#8f66ff]" },
                  { label: "Office Approved", value: coordinator.officeApprovedQueue, tone: "text-[#c35cff]" },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-[22px] border border-[#eee7ff] bg-white/90 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8da1cf]">{metric.label}</div>
                    <div className={`mt-2 text-2xl font-semibold ${metric.tone}`}>{metric.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-[20px] border border-[#ece6ff] bg-[#f8f9ff] px-4 py-3 text-sm text-[#5f6f91]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8da1cf]">Properties touched</div>
                  <div className="mt-2 text-xl font-semibold text-[#26324f]">{coordinator.propertiesCount}</div>
                </div>
                <div className="rounded-[20px] border border-[#ece6ff] bg-[#f8f9ff] px-4 py-3 text-sm text-[#5f6f91]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8da1cf]">Contractors engaged</div>
                  <div className="mt-2 text-xl font-semibold text-[#26324f]">{coordinator.contractorTouches}</div>
                </div>
                <div className="rounded-[20px] border border-[#ece6ff] bg-[#f8f9ff] px-4 py-3 text-sm text-[#5f6f91]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8da1cf]">Due this week</div>
                  <div className="mt-2 text-xl font-semibold text-[#26324f]">{coordinator.dueThisWeek}</div>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#26324f]">
                  <Sparkles className="h-4 w-4 text-[#9b7fe2]" />
                  Service mix
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {coordinator.serviceTypes.slice(0, 6).map((serviceType) => (
                    <span key={serviceType} className="rounded-full border border-[#ebe5ff] bg-white px-3 py-1.5 text-xs font-medium text-[#62739a]">
                      {serviceType.replaceAll("_", " ")}
                    </span>
                  ))}
                  {coordinator.serviceTypes.length === 0 ? (
                    <span className="text-sm text-[#7d8bb1]">No assigned service mix yet.</span>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-[#ece6ff] bg-white/90 p-4">
                <div className="text-base font-semibold text-[#26324f]">Recent queue</div>
                <div className="mt-1 text-sm text-[#7280ad]">The latest work orders currently sitting with this coordinator.</div>
                <div className="mt-4 space-y-3">
                  {coordinator.recentWorkOrders.map((workOrder) => (
                    <Link
                      key={workOrder.id}
                      href={`/dashboard/admin/work-orders/${workOrder.id}`}
                      className="block rounded-[18px] border border-[#efebff] bg-[linear-gradient(180deg,#ffffff_0%,#faf8ff_100%)] px-4 py-3 transition hover:border-[#d9cfff]"
                    >
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="font-semibold text-[#26324f]">{workOrder.workOrderNumber || workOrder.title}</div>
                          <div className="mt-1 text-sm text-[#7180a6]">{workOrder.addressLine1}, {workOrder.city}, {workOrder.state}</div>
                          <div className="mt-1 text-xs text-[#8b99bf]">
                            {workOrder.serviceType.replaceAll("_", " ")}
                            {workOrder.assignedContractorName ? ` • ${workOrder.assignedContractorName}` : ""}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full border border-[#ece6ff] bg-white px-2.5 py-1 font-semibold uppercase tracking-[0.16em] text-[#745edf]">
                            {workOrder.status.replaceAll("_", " ")}
                          </span>
                          <span className="rounded-full bg-[#f4f7ff] px-2.5 py-1 font-medium text-[#607094]">
                            Due {workOrder.dueDate ? new Date(workOrder.dueDate).toLocaleDateString() : "TBD"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {coordinator.recentWorkOrders.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-[#e8e1ff] bg-[#fbf9ff] px-4 py-6 text-center text-sm text-[#7b89b1]">
                      No work orders are assigned to this coordinator yet.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
