"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Edit,
  Eye,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react"

import type { ContractorMatrixItem, ContractorMatrixSummary } from "@/modules/workforce/types"

type EditableContractor = {
  id: string
  name: string
  email: string
  phone?: string | null
  company?: string | null
  address?: string | null
}

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export default function AdminContractors() {
  const router = useRouter()
  const [contractors, setContractors] = useState<ContractorMatrixItem[]>([])
  const [summary, setSummary] = useState<ContractorMatrixSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [editModal, setEditModal] = useState<EditableContractor | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [viewContractor, setViewContractor] = useState<ContractorMatrixItem | null>(null)
  const [viewJobsContractor, setViewJobsContractor] = useState<ContractorMatrixItem | null>(null)
  const [contractorJobs, setContractorJobs] = useState<any[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    void fetchContractors()
  }, [])

  const fetchContractors = async () => {
    try {
      setLoadError("")
      const response = await fetch(`/api/admin/contractors?ts=${Date.now()}`, {
        cache: "no-store",
      })
      if (response.ok) {
        const data = await response.json()
        setContractors(Array.isArray(data.contractors) ? data.contractors : [])
        setSummary(data.summary ?? null)
      } else {
        const error = await response.json().catch(() => ({}))
        setContractors([])
        setSummary(null)
        setLoadError(error.error || "Unable to load contractors")
      }
    } catch (error) {
      console.error("Error fetching contractors:", error)
      setContractors([])
      setSummary(null)
      setLoadError("Unable to load contractors")
    } finally {
      setLoading(false)
    }
  }

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()

  const filteredContractors = useMemo(() => {
    if (!normalizedSearchTerm) return contractors

    return contractors.filter((contractor) =>
      [
        contractor.name,
        contractor.email,
        contractor.company,
        contractor.address,
        contractor.phone,
        ...contractor.statesCovered,
        ...contractor.citiesCovered,
        ...contractor.serviceTypes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearchTerm)
    )
  }, [contractors, normalizedSearchTerm])

  const handleViewJobs = async (contractor: ContractorMatrixItem) => {
    setViewJobsContractor(contractor)
    setJobsLoading(true)
    setContractorJobs([])
    try {
      const response = await fetch("/api/work-orders")
      if (response.ok) {
        const data = await response.json()
        const jobs = Array.isArray(data)
          ? data.filter((order: any) => order.assignedContractor?.id === contractor.id || order.assignedContractorId === contractor.id)
          : []
        setContractorJobs(jobs)
      }
    } catch (error) {
      console.error("Error fetching contractor jobs:", error)
    } finally {
      setJobsLoading(false)
    }
  }

  const handleOpenEdit = (contractor: ContractorMatrixItem) => {
    setEditModal({
      id: contractor.id,
      name: contractor.name,
      email: contractor.email,
      phone: contractor.phone || "",
      company: contractor.company || "",
      address: contractor.address || "",
    })
  }

  const handleSaveEdit = async () => {
    if (!editModal) return
    setSavingEdit(true)
    try {
      const response = await fetch(`/api/users/${editModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editModal.name,
          email: editModal.email,
          phone: editModal.phone,
          company: editModal.company,
          address: editModal.address,
          role: "CONTRACTOR",
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        alert(error.error || "Failed to update contractor")
        return
      }

      await fetchContractors()
      setEditModal(null)
    } catch (error) {
      console.error("Error updating contractor:", error)
      alert("Failed to update contractor")
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (contractor: ContractorMatrixItem) => {
    if (!confirm(`Delete contractor ${contractor.name}?`)) return

    setDeletingId(contractor.id)
    try {
      const response = await fetch(`/api/users/${contractor.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        alert(error.error || "Failed to delete contractor")
        return
      }

      await fetchContractors()
      if (viewJobsContractor?.id === contractor.id) {
        setViewJobsContractor(null)
        setContractorJobs([])
      }
      if (viewContractor?.id === contractor.id) {
        setViewContractor(null)
      }
    } catch (error) {
      console.error("Error deleting contractor:", error)
      alert("Failed to delete contractor")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/10 border-t-[#ff7a49]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 text-[#435072]">
      <div className="flex flex-col gap-4 rounded-[30px] border border-[#e3dcff] bg-[linear-gradient(135deg,#ffffff_0%,#f9f4ff_48%,#eef6ff_100%)] p-6 shadow-[0_22px_50px_rgba(193,184,244,0.18)] lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#eadfff] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#8a78cb]">
            <Users className="h-3.5 w-3.5" />
            Vendor intelligence matrix
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#2b3159]">Contractors</h2>
          <p className="mt-2 max-w-3xl text-sm text-[#7280ad]">
            See real workload, area coverage, service mix, efficiency, accuracy, and capacity posture for every contractor
            in one admin command view.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Vendors", value: summary?.totalContractors ?? 0, tone: "text-[#7c63ff]" },
            { label: "Active", value: summary?.activeContractors ?? 0, tone: "text-[#2f7cff]" },
            { label: "Open Orders", value: summary?.totalActiveOrders ?? 0, tone: "text-[#5c70ff]" },
            { label: "Avg Accuracy", value: `${summary?.averageAccuracyScore ?? 0}%`, tone: "text-[#c35cff]" },
          ].map((item) => (
            <div key={item.label} className="rounded-[22px] border border-[#ece5ff] bg-white/85 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8da1cf]">{item.label}</div>
              <div className={`mt-2 text-2xl font-semibold ${item.tone}`}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] p-4 shadow-[0_16px_36px_rgba(196,186,255,0.14)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f8ab0]" />
            <input
              type="text"
              placeholder="Search contractors by name, email, company, address, coverage, or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-[#e2dbff] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] py-2.5 pl-10 pr-4 text-[#2b3159] outline-none"
            />
          </div>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-4 py-2.5 text-sm font-medium text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Contractor
          </Link>
        </div>
        {loadError ? (
          <div className="mt-3 rounded-2xl border border-[#ff7a49]/20 bg-[#fff2eb] px-4 py-3 text-sm text-[#d8693a]">
            {loadError}
          </div>
        ) : null}
      </div>

      {filteredContractors.length === 0 && !loadError ? (
        <div className="rounded-[28px] border border-[#ebe5ff] bg-[linear-gradient(180deg,#ffffff_0%,#faf8ff_100%)] p-10 text-center shadow-[0_14px_30px_rgba(196,186,255,0.12)]">
          <Users className="mx-auto h-12 w-12 text-[#9a8ddd]" />
          <h3 className="mt-4 text-xl font-semibold text-[#2b3159]">No contractors match your search</h3>
          <p className="mt-2 text-sm text-[#7280ad]">Try a different name, email, location, or service specialty.</p>
        </div>
      ) : null}

      {filteredContractors.length > 0 ? (
        <div className="overflow-hidden rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#faf8ff_100%)] shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#eee7ff]">
              <thead className="bg-[linear-gradient(180deg,#f8f5ff_0%,#eef4ff_100%)] text-left text-xs uppercase tracking-[0.18em] text-[#8ca0ca]">
                <tr>
                  <th className="px-5 py-4">Vendor</th>
                  <th className="px-5 py-4">Coverage</th>
                  <th className="px-5 py-4">Load</th>
                  <th className="px-5 py-4">Efficiency</th>
                  <th className="px-5 py-4">Accuracy</th>
                  <th className="px-5 py-4">Capacity</th>
                  <th className="px-5 py-4">Specialties</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee7ff] text-sm text-[#435072]">
                {filteredContractors.map((contractor) => (
                  <tr key={contractor.id} className="align-top hover:bg-[rgba(247,243,255,0.65)]">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        {contractor.avatarUrl ? (
                          <img src={contractor.avatarUrl} alt={contractor.name} className="h-12 w-12 rounded-2xl object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fff3fb_0%,#edf4ff_100%)] font-semibold text-[#755ee0]">
                            {initialsFromName(contractor.name)}
                          </div>
                        )}
                        <div>
                          <button
                            type="button"
                            onClick={() => setViewContractor(contractor)}
                            className="text-left text-lg font-semibold text-[#2b3159] hover:text-[#745edf]"
                          >
                            {contractor.name}
                          </button>
                          <div className="mt-1 text-sm text-[#7280ad]">{contractor.company || "Independent contractor"}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#607094]">
                            <a href={`mailto:${contractor.email}`} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                              <Mail className="h-3.5 w-3.5 text-[#8f66ff]" />
                              Email
                            </a>
                            {contractor.phone ? (
                              <a href={`tel:${contractor.phone}`} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                                <Phone className="h-3.5 w-3.5 text-[#2f7cff]" />
                                Call
                              </a>
                            ) : null}
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-[#7d8bb1]">
                            <Star className="h-3.5 w-3.5 fill-[#ffd08a] text-[#ffd08a]" />
                            {contractor.rating ? `${contractor.rating.toFixed(1)} / 5` : "New profile"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-[#2b3159]">{contractor.statesCovered.length} states</div>
                      <div className="mt-1 text-[#7280ad]">{contractor.citiesCovered.length} cities</div>
                      <div className="mt-2 inline-flex items-center gap-1 text-xs text-[#607094]">
                        <MapPin className="h-3.5 w-3.5 text-[#8f66ff]" />
                        {contractor.statesCovered.slice(0, 3).join(", ") || "No coverage yet"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-[#2b3159]">{contractor.activeOrders} active</div>
                      <div className="mt-1 text-[#7280ad]">{contractor.completedOrders} completed</div>
                      <div className="mt-2 text-xs text-[#607094]">
                        {contractor.overdueOrders} overdue • {contractor.officeApprovedQueue} invoice ready
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xl font-semibold text-[#2f7cff]">{contractor.efficiencyScore}%</div>
                      <div className="mt-2 h-2.5 w-28 overflow-hidden rounded-full bg-[#e8efff]">
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#4f7dff_0%,#6fd1ff_100%)]" style={{ width: `${contractor.efficiencyScore}%` }} />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xl font-semibold text-[#c35cff]">{contractor.accuracyScore}%</div>
                      <div className="mt-2 h-2.5 w-28 overflow-hidden rounded-full bg-[#f2eaff]">
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#d26fff_0%,#8e6cff_100%)]" style={{ width: `${contractor.accuracyScore}%` }} />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xl font-semibold text-[#2b3159]">{contractor.capacityUsage}%</div>
                      <div className="mt-1 text-[#7280ad]">{contractor.capacityLabel}</div>
                      <div className="mt-2 h-2.5 w-28 overflow-hidden rounded-full bg-[#ecf0ff]">
                        <div
                          className={`h-full rounded-full ${
                            contractor.capacityUsage >= 100
                              ? "bg-[linear-gradient(90deg,#ff8b6b_0%,#ff5c7e_100%)]"
                              : contractor.capacityUsage >= 80
                                ? "bg-[linear-gradient(90deg,#ffb860_0%,#ff8b6b_100%)]"
                                : "bg-[linear-gradient(90deg,#72c6ff_0%,#6f8dff_100%)]"
                          }`}
                          style={{ width: `${contractor.capacityUsage}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex max-w-[240px] flex-wrap gap-2">
                        {contractor.serviceTypes.map((serviceType) => (
                          <span key={serviceType} className="rounded-full border border-[#ece6ff] bg-white px-2.5 py-1 text-[11px] font-medium text-[#62739a]">
                            {serviceType.replaceAll("_", " ")}
                          </span>
                        ))}
                        {contractor.serviceTypes.length === 0 ? <span className="text-[#7280ad]">No service history yet</span> : null}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setViewContractor(contractor)} className="rounded-xl border border-[#ece6ff] bg-white p-2 text-[#8fb0ff]" title="View contractor">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleOpenEdit(contractor)} className="rounded-xl border border-[#ece6ff] bg-white p-2 text-[#7ee0a6]" title="Edit contractor">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(contractor)}
                          className="rounded-xl border border-[#ffe0db] bg-[#fff6f3] p-2 text-[#ff8d7d] disabled:opacity-50"
                          title="Delete contractor"
                          disabled={deletingId === contractor.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {viewJobsContractor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/8 bg-[#202840] shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
              <div>
                <h3 className="text-xl font-semibold text-white">{viewJobsContractor.name} Jobs</h3>
                <p className="mt-1 text-sm text-[#9aa6cc]">{viewJobsContractor.company || viewJobsContractor.email}</p>
              </div>
              <button onClick={() => setViewJobsContractor(null)} className="rounded-full border border-white/10 bg-[#2a3350] p-2 text-[#dce5ff]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-6">
              {jobsLoading ? (
                <div className="py-10 text-center text-[#9aa6cc]">Loading jobs...</div>
              ) : contractorJobs.length > 0 ? (
                <div className="space-y-4">
                  {contractorJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/dashboard/admin/work-orders/${job.id}`}
                      className="block rounded-[20px] border border-white/8 bg-[#242d46] p-5 transition hover:bg-[#2b3553]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-lg font-semibold text-white">{job.workOrderNumber || job.id}</div>
                          <div className="mt-1 text-sm text-[#9aa6cc]">{job.addressLine1}, {job.city}, {job.state}</div>
                          <div className="mt-3 text-sm text-[#dce5ff]">{job.serviceType || "Service"}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="rounded-full bg-[#2e4475] px-3 py-1 text-xs font-medium text-[#dce5ff]">
                            {String(job.status || "").replaceAll("_", " ")}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault()
                              router.push(`/dashboard/admin/work-orders/${job.id}`)
                            }}
                            className="rounded-xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-3 py-2 text-xs font-medium text-white"
                          >
                            Open Work Order
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-[#9aa6cc]">No assigned work orders found for this contractor.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {viewContractor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-[28px] border border-white/8 bg-[#202840] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {viewContractor.avatarUrl ? (
                  <img src={viewContractor.avatarUrl} alt={viewContractor.name} className="h-16 w-16 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2b3553] text-lg font-semibold text-[#dce5ff]">
                    {initialsFromName(viewContractor.name)}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold text-white">{viewContractor.name}</h3>
                  <p className="mt-1 text-sm text-[#9aa6cc]">{viewContractor.company || "Independent Contractor"}</p>
                  <p className="mt-1 text-xs text-[#7f8ab0]">Added {new Date(viewContractor.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <button onClick={() => setViewContractor(null)} className="rounded-full border border-white/10 bg-[#2a3350] p-2 text-[#dce5ff]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-[#242d46] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7f8ab0]">Email</div>
                <div className="mt-2 text-base text-white">{viewContractor.email}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#242d46] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7f8ab0]">Phone</div>
                <div className="mt-2 text-base text-white">{viewContractor.phone || "Not provided"}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#242d46] p-4 md:col-span-2">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7f8ab0]">Address</div>
                <div className="mt-2 text-base text-white">{viewContractor.address || "Not provided"}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              {[
                { label: "Active", value: viewContractor.activeOrders },
                { label: "Completed", value: viewContractor.completedOrders },
                { label: "Efficiency", value: `${viewContractor.efficiencyScore}%` },
                { label: "Accuracy", value: `${viewContractor.accuracyScore}%` },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/8 bg-[#242d46] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#7f8ab0]">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-white/8 bg-[#242d46] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#7f8ab0]">Coverage & specialties</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[...viewContractor.statesCovered, ...viewContractor.serviceTypes].slice(0, 8).map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-[#2b3553] px-3 py-1.5 text-xs text-[#dce5ff]">
                    {item.replaceAll("_", " ")}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={() => {
                  setViewContractor(null)
                  handleViewJobs(viewContractor)
                }}
                className="rounded-2xl border border-white/10 bg-[#2e4475] px-5 py-3 text-sm font-medium text-[#dce5ff]"
              >
                View Jobs
              </button>
              <button
                onClick={() => {
                  setViewContractor(null)
                  handleOpenEdit(viewContractor)
                }}
                className="rounded-2xl border border-white/10 bg-[#22453a] px-5 py-3 text-sm font-medium text-[#8ce8b1]"
              >
                Edit Contractor
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/8 bg-[#202840] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Edit Contractor</h3>
                <p className="mt-1 text-sm text-[#9aa6cc]">Update contractor details and keep the network current.</p>
              </div>
              <button onClick={() => setEditModal(null)} className="rounded-full border border-white/10 bg-[#2a3350] p-2 text-[#dce5ff]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-[#9aa6cc]">Name</label>
                <input
                  value={editModal.name}
                  onChange={(e) => setEditModal((current) => current ? { ...current, name: e.target.value } : current)}
                  className="w-full rounded-2xl border border-white/10 bg-[#2a3350] px-4 py-3 text-[#edf2ff] outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[#9aa6cc]">Company</label>
                <input
                  value={editModal.company || ""}
                  onChange={(e) => setEditModal((current) => current ? { ...current, company: e.target.value } : current)}
                  className="w-full rounded-2xl border border-white/10 bg-[#2a3350] px-4 py-3 text-[#edf2ff] outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[#9aa6cc]">Email</label>
                <input
                  value={editModal.email}
                  onChange={(e) => setEditModal((current) => current ? { ...current, email: e.target.value } : current)}
                  className="w-full rounded-2xl border border-white/10 bg-[#2a3350] px-4 py-3 text-[#edf2ff] outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[#9aa6cc]">Phone</label>
                <input
                  value={editModal.phone || ""}
                  onChange={(e) => setEditModal((current) => current ? { ...current, phone: e.target.value } : current)}
                  className="w-full rounded-2xl border border-white/10 bg-[#2a3350] px-4 py-3 text-[#edf2ff] outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-[#9aa6cc]">Address</label>
                <input
                  value={editModal.address || ""}
                  onChange={(e) => setEditModal((current) => current ? { ...current, address: e.target.value } : current)}
                  className="w-full rounded-2xl border border-white/10 bg-[#2a3350] px-4 py-3 text-[#edf2ff] outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditModal(null)}
                className="rounded-2xl border border-white/10 bg-[#2a3350] px-5 py-3 text-sm font-medium text-[#dce5ff]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {savingEdit ? "Saving..." : "Save Contractor"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
