"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CheckCircle,
  Edit,
  Eye,
  Mail,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react"

interface Contractor {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  role: string
  createdAt: string
  _count: {
    workOrdersAsClient: number
    workOrdersAssigned: number
  }
}

type EditableContractor = {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
}

export default function AdminContractors() {
  const router = useRouter()
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [editModal, setEditModal] = useState<EditableContractor | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [viewContractor, setViewContractor] = useState<Contractor | null>(null)
  const [viewJobsContractor, setViewJobsContractor] = useState<Contractor | null>(null)
  const [contractorJobs, setContractorJobs] = useState<any[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchContractors()
  }, [])

  const fetchContractors = async () => {
    try {
      setLoadError("")
      const response = await fetch(`/api/admin/contractors?ts=${Date.now()}`, {
        cache: "no-store",
      })
      if (response.ok) {
        const data = await response.json()
        const nextContractors = Array.isArray(data.contractors) ? data.contractors : []
        setContractors(nextContractors)
      } else {
        const error = await response.json().catch(() => ({}))
        setContractors([])
        setLoadError(error.error || "Unable to load contractors")
      }
    } catch (error) {
      console.error("Error fetching contractors:", error)
      setContractors([])
      setLoadError("Unable to load contractors")
    } finally {
      setLoading(false)
    }
  }

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()

  const filteredContractors = useMemo(() => {
    if (!normalizedSearchTerm) return contractors

    return contractors.filter((contractor) =>
      contractor.name.toLowerCase().includes(normalizedSearchTerm) ||
      contractor.email.toLowerCase().includes(normalizedSearchTerm) ||
      (contractor.company?.toLowerCase().includes(normalizedSearchTerm) || false) ||
      (contractor.address?.toLowerCase().includes(normalizedSearchTerm) || false)
    )
  }, [contractors, normalizedSearchTerm])

  const handleViewJobs = async (contractor: Contractor) => {
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

  const handleOpenEdit = (contractor: Contractor) => {
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

  const handleDelete = async (contractor: Contractor) => {
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
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-[#2b3159] sm:text-3xl sm:truncate">Contractors</h2>
          <p className="mt-1 text-sm text-[#7280ad]">Manage your network of property preservation contractors</p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <Link
            href="/auth/signup"
            className="inline-flex items-center rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Contractor
          </Link>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] p-4 shadow-[0_16px_36px_rgba(196,186,255,0.14)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f8ab0]" />
          <input
            type="text"
            placeholder="Search contractors by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-[#e2dbff] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] py-2 pl-10 pr-4 text-[#2b3159] outline-none"
          />
        </div>
        {loadError ? (
          <div className="mt-3 rounded-2xl border border-[#ff7a49]/20 bg-[#3a2230] px-4 py-3 text-sm text-[#ffd4c8]">
            {loadError}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredContractors.map((contractor) => (
          <div key={contractor.id} className="rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] p-6 shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="rounded-full bg-[linear-gradient(135deg,#fff4fc_0%,#eef4ff_100%)] p-3">
                  <Users className="h-6 w-6 text-[#8fb0ff]" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-[#2b3159]">{contractor.name}</h3>
                  {contractor.company ? <p className="text-sm text-[#7280ad]">{contractor.company}</p> : null}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => setViewContractor(contractor)} className="text-[#8fb0ff] hover:text-[#bfd3ff]" title="View contractor">
                  <Eye className="h-4 w-4" />
                </button>
                <button onClick={() => handleOpenEdit(contractor)} className="text-[#7ee0a6] hover:text-[#a6f0c2]" title="Edit contractor">
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(contractor)}
                  className="text-[#ff8d7d] hover:text-[#ffb3a8] disabled:opacity-50"
                  title="Delete contractor"
                  disabled={deletingId === contractor.id}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center text-sm text-[#5b6994]">
                <Mail className="mr-2 h-4 w-4" />
                {contractor.email}
              </div>
              {contractor.phone ? (
                <div className="flex items-center text-sm text-[#5b6994]">
                  <Phone className="mr-2 h-4 w-4" />
                  {contractor.phone}
                </div>
              ) : null}
            </div>

            <div className="mt-4 border-t border-[#ebe5ff] pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-[#7280ad]">Jobs Completed</div>
                  <div className="font-semibold text-[#2b3159]">{contractor._count.workOrdersAssigned}</div>
                </div>
                <div>
                  <div className="text-[#7280ad]">Rating</div>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-current text-[#ffd08a]" />
                    <span className="ml-1 font-semibold text-[#2b3159]">4.8</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              <button className="flex-1 rounded-xl bg-[#22453a] px-3 py-2 text-sm font-medium text-[#8ce8b1] hover:bg-[#285442]">
                <CheckCircle className="mr-1 inline h-4 w-4" />
                Active
              </button>
              <button
                onClick={() => handleViewJobs(contractor)}
                className="flex-1 rounded-xl bg-[#2e4475] px-3 py-2 text-sm font-medium text-[#d9e6ff] hover:bg-[#355188]"
              >
                View Jobs
              </button>
            </div>
          </div>
        ))}
      </div>

      {contractors.length === 0 && !loadError ? (
        <div className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-[#7f8ab0]" />
          <h3 className="mt-2 text-sm font-medium text-white">No contractors found</h3>
          <p className="mt-1 text-sm text-[#9aa6cc]">
            Get started by adding your first contractor.
          </p>
        </div>
      ) : null}

      {contractors.length > 0 && filteredContractors.length === 0 ? (
        <div className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-[#7f8ab0]" />
          <h3 className="mt-2 text-sm font-medium text-white">No contractors match your search</h3>
          <p className="mt-1 text-sm text-[#9aa6cc]">
            Try adjusting the contractor name, email, company, or address.
          </p>
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
          <div className="w-full max-w-2xl rounded-[28px] border border-white/8 bg-[#202840] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-[#2b3553] p-4">
                  <Users className="h-7 w-7 text-[#8fb0ff]" />
                </div>
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
              <div className="rounded-2xl border border-white/8 bg-[#242d46] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7f8ab0]">Assigned Jobs</div>
                <div className="mt-2 text-2xl font-semibold text-white">{viewContractor._count.workOrdersAssigned}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#242d46] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7f8ab0]">Status</div>
                <div className="mt-2 inline-flex rounded-full bg-[#22453a] px-3 py-1 text-sm font-medium text-[#8ce8b1]">Active Contractor</div>
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
