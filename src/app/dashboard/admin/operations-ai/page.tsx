"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Brain,
  Mail,
  Mic,
  PhoneCall,
  Sparkles,
  Wand2,
} from "lucide-react"

type DispatchPayload = {
  overview: {
    queuedWorkOrders: number
    availableContractors: number
    averageOnTimeRate: number
  }
  dispatchQueue: Array<{
    workOrderId: string
    workOrderNumber: string
    title: string
    serviceType: string
    city: string
    state: string
    dueDate: string | null
    status: string
    clientName: string
    recommendations: Array<{
      contractorId: string
      contractorName: string
      company: string | null
      phone: string | null
      email: string
      score: number
      activeOrders: number
      onTimeRate: number
      rationale: string[]
    }>
  }>
}

type EmailBiPayload = {
  ticketVolume: number
  urgentTickets: number
  openTickets: number
  invoiceVolume: number
  openInvoiceValue: number
  overdueWorkOrders: number
  latestOperationalSignals: Array<{
    id: string
    title: string
    body: string
    createdAt: string
  }>
}

type ParsedEmail = {
  classification: string
  confidence: number
  summary: string
  actionItems: string[]
  extracted: {
    workOrders: string[]
    phoneNumbers: string[]
    propertyHint: string | null
  }
}

type CallAutomation = {
  id: string
  name: string
  status: string
  audienceType: string
  triggerType: string
  voiceProfile: string | null
  scheduleSummary: string | null
  escalationEnabled: boolean
  nextRunAt: string | null
  createdByUser?: { name: string | null; email: string | null } | null
}

const initialAutomationForm = {
  name: "",
  audienceType: "CONTRACTOR",
  triggerType: "UNREAD_MESSAGE",
  voiceProfile: "Coordinator voice",
  instructions: "",
  scheduleSummary: "",
  escalationEnabled: true,
}

export default function AdminOperationsAIPage() {
  const [dispatch, setDispatch] = useState<DispatchPayload | null>(null)
  const [emailBi, setEmailBi] = useState<EmailBiPayload | null>(null)
  const [automations, setAutomations] = useState<CallAutomation[]>([])
  const [loading, setLoading] = useState(true)
  const [emailForm, setEmailForm] = useState({ from: "", subject: "", content: "" })
  const [parsedEmail, setParsedEmail] = useState<ParsedEmail | null>(null)
  const [automationForm, setAutomationForm] = useState(initialAutomationForm)
  const [submittingAutomation, setSubmittingAutomation] = useState(false)

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    try {
      const [dispatchResponse, emailResponse, callResponse] = await Promise.all([
        fetch("/api/admin/dispatch-recommendations"),
        fetch("/api/admin/email-intelligence"),
        fetch("/api/admin/call-automation"),
      ])

      if (dispatchResponse.ok) {
        setDispatch(await dispatchResponse.json())
      }
      if (emailResponse.ok) {
        setEmailBi(await emailResponse.json())
      }
      if (callResponse.ok) {
        const payload = await callResponse.json()
        setAutomations(Array.isArray(payload.automations) ? payload.automations : [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleParseEmail() {
    setParsedEmail(null)
    const response = await fetch("/api/admin/email-intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailForm),
    })
    if (response.ok) {
      setParsedEmail(await response.json())
    }
  }

  async function handleCreateAutomation() {
    setSubmittingAutomation(true)
    try {
      const response = await fetch("/api/admin/call-automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(automationForm),
      })
      if (response.ok) {
        const payload = await response.json()
        setAutomations((current) => [payload.automation, ...current])
        setAutomationForm(initialAutomationForm)
      }
    } finally {
      setSubmittingAutomation(false)
    }
  }

  async function toggleAutomationStatus(id: string, status: string) {
    const nextStatus = status === "ACTIVE" ? "PAUSED" : "ACTIVE"
    const response = await fetch("/api/admin/call-automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus }),
    })
    if (response.ok) {
      const payload = await response.json()
      setAutomations((current) =>
        current.map((automation) => (automation.id === id ? payload.automation : automation))
      )
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-[#7280ad]">Loading Operations AI…</div>
  }

  return (
    <div className="space-y-6 text-[#435072]">
      <div className="rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-6 shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#eadfff] bg-[#f7f2ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a78cb]">
              <Brain className="h-3.5 w-3.5" />
              Operations AI
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-[#26324f]">AI decision engine, email intelligence, and call automation</h1>
            <p className="mt-2 max-w-4xl text-sm text-[#7280ad]">
              Use live contractor history for dispatch recommendations, parse incoming email into operations actions, and schedule AI calls for contractors, clients, and escalation flows.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-[#ece5ff] bg-white/85 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#95a5cb]">Queued dispatch</div>
              <div className="mt-1 text-2xl font-semibold text-[#26324f]">{dispatch?.overview.queuedWorkOrders ?? 0}</div>
            </div>
            <div className="rounded-[22px] border border-[#ece5ff] bg-white/85 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#95a5cb]">Available contractors</div>
              <div className="mt-1 text-2xl font-semibold text-[#26324f]">{dispatch?.overview.availableContractors ?? 0}</div>
            </div>
            <div className="rounded-[22px] border border-[#ece5ff] bg-white/85 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#95a5cb]">On-time rate</div>
              <div className="mt-1 text-2xl font-semibold text-[#26324f]">{(dispatch?.overview.averageOnTimeRate ?? 0).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <section className="rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-6 shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fef5ff_0%,#eef6ff_100%)]">
              <Sparkles className="h-5 w-5 text-[#7d58df]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#26324f]">Contractor recommendation & dispatch</h2>
              <p className="mt-1 text-sm text-[#7280ad]">Recommendations are scored from service-type history, location familiarity, active workload, and on-time completion.</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {dispatch?.dispatchQueue.map((row) => (
              <div key={row.workOrderId} className="rounded-[24px] border border-[#ece5ff] bg-white/85 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/dashboard/admin/work-orders/${row.workOrderId}`} className="text-base font-semibold text-[#26324f] hover:text-[#7d58df]">
                      {row.workOrderNumber}
                    </Link>
                    <p className="mt-1 text-sm text-[#7280ad]">{row.clientName} · {row.city}, {row.state} · {row.serviceType.replaceAll("_", " ")}</p>
                  </div>
                  <div className="rounded-full bg-[#f7f2ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a78cb]">
                    {row.status}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  {row.recommendations.map((recommendation) => (
                    <div key={recommendation.contractorId} className="rounded-[20px] border border-[#f0ebff] bg-[#fbf9ff] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link href={`/dashboard/admin/contractors`} className="text-sm font-semibold text-[#26324f] hover:text-[#7d58df]">
                            {recommendation.company || recommendation.contractorName}
                          </Link>
                          <div className="mt-1 text-xs text-[#7280ad]">{recommendation.contractorName}</div>
                        </div>
                        <div className="rounded-full bg-[linear-gradient(135deg,#fff2e9_0%,#f4ecff_100%)] px-2.5 py-1 text-xs font-semibold text-[#ef7b49]">
                          {recommendation.score.toFixed(0)}
                        </div>
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs text-[#5c688d]">
                        {recommendation.rationale.map((reason) => (
                          <div key={reason}>• {reason}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-6 shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fff9f1_0%,#fff1fb_100%)]">
              <Mail className="h-5 w-5 text-[#ef7b49]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#26324f]">Email parsing & business intelligence</h2>
              <p className="mt-1 text-sm text-[#7280ad]">Classify inbound email and convert it into action before it gets lost in the inbox.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Open tickets", emailBi?.openTickets ?? 0],
              ["Urgent tickets", emailBi?.urgentTickets ?? 0],
              ["Overdue work orders", emailBi?.overdueWorkOrders ?? 0],
              ["Open invoice value", `$${(emailBi?.openInvoiceValue ?? 0).toLocaleString()}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[20px] border border-[#ece5ff] bg-white/85 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#95a5cb]">{label}</div>
                <div className="mt-1 text-xl font-semibold text-[#26324f]">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[24px] border border-[#ece5ff] bg-white/85 p-4">
            <div className="grid gap-3">
              <input value={emailForm.from} onChange={(event) => setEmailForm((current) => ({ ...current, from: event.target.value }))} placeholder="From email" className="rounded-2xl border border-[#e5ddff] bg-[#fbf9ff] px-4 py-3 text-sm outline-none" />
              <input value={emailForm.subject} onChange={(event) => setEmailForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Subject" className="rounded-2xl border border-[#e5ddff] bg-[#fbf9ff] px-4 py-3 text-sm outline-none" />
              <textarea value={emailForm.content} onChange={(event) => setEmailForm((current) => ({ ...current, content: event.target.value }))} placeholder="Paste the incoming email body here…" className="min-h-[160px] rounded-2xl border border-[#e5ddff] bg-[#fbf9ff] px-4 py-3 text-sm outline-none" />
              <button type="button" onClick={() => void handleParseEmail()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ff7a49_0%,#ff6b3c_100%)] px-4 py-3 text-sm font-semibold text-white">
                <Wand2 className="h-4 w-4" />
                Parse email
              </button>
            </div>

            {parsedEmail ? (
              <div className="mt-4 rounded-[22px] border border-[#ece5ff] bg-[#fbf9ff] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[#26324f]">{parsedEmail.classification.replaceAll("_", " ")}</div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a78cb]">{(parsedEmail.confidence * 100).toFixed(0)}% confidence</div>
                </div>
                <p className="mt-2 text-sm text-[#5c688d]">{parsedEmail.summary}</p>
                <div className="mt-3 space-y-2 text-sm text-[#435072]">
                  {parsedEmail.actionItems.map((item) => (
                    <div key={item}>• {item}</div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-6 shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#eef8ff_0%,#f8f0ff_100%)]">
            <PhoneCall className="h-5 w-5 text-[#2f7cff]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#26324f]">AI calling automation</h2>
            <p className="mt-1 text-sm text-[#7280ad]">Automate due-date, unread-message, and delay follow-up calls with voice profile and escalation control.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
          <div className="rounded-[24px] border border-[#ece5ff] bg-white/85 p-4">
            <div className="grid gap-3">
              <input value={automationForm.name} onChange={(event) => setAutomationForm((current) => ({ ...current, name: event.target.value }))} placeholder="Automation name" className="rounded-2xl border border-[#e5ddff] bg-[#fbf9ff] px-4 py-3 text-sm outline-none" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={automationForm.audienceType} onChange={(event) => setAutomationForm((current) => ({ ...current, audienceType: event.target.value }))} className="rounded-2xl border border-[#e5ddff] bg-[#fbf9ff] px-4 py-3 text-sm outline-none">
                  <option value="CONTRACTOR">Contractor</option>
                  <option value="CLIENT">Client</option>
                  <option value="COORDINATOR">Coordinator</option>
                </select>
                <select value={automationForm.triggerType} onChange={(event) => setAutomationForm((current) => ({ ...current, triggerType: event.target.value }))} className="rounded-2xl border border-[#e5ddff] bg-[#fbf9ff] px-4 py-3 text-sm outline-none">
                  <option value="UNREAD_MESSAGE">Unread message</option>
                  <option value="DUE_DATE">Due date risk</option>
                  <option value="DELAY_ESCALATION">Delay escalation</option>
                  <option value="CLIENT_UPDATE">Client update</option>
                </select>
              </div>
              <input value={automationForm.voiceProfile} onChange={(event) => setAutomationForm((current) => ({ ...current, voiceProfile: event.target.value }))} placeholder="Voice profile" className="rounded-2xl border border-[#e5ddff] bg-[#fbf9ff] px-4 py-3 text-sm outline-none" />
              <input value={automationForm.scheduleSummary} onChange={(event) => setAutomationForm((current) => ({ ...current, scheduleSummary: event.target.value }))} placeholder="Schedule summary (e.g. every 2 hours until acknowledged)" className="rounded-2xl border border-[#e5ddff] bg-[#fbf9ff] px-4 py-3 text-sm outline-none" />
              <textarea value={automationForm.instructions} onChange={(event) => setAutomationForm((current) => ({ ...current, instructions: event.target.value }))} placeholder="Tell the AI what to say, when to escalate, and what result to capture..." className="min-h-[140px] rounded-2xl border border-[#e5ddff] bg-[#fbf9ff] px-4 py-3 text-sm outline-none" />
              <label className="inline-flex items-center gap-2 text-sm text-[#5c688d]">
                <input type="checkbox" checked={automationForm.escalationEnabled} onChange={(event) => setAutomationForm((current) => ({ ...current, escalationEnabled: event.target.checked }))} />
                Escalation enabled
              </label>
              <button type="button" disabled={submittingAutomation} onClick={() => void handleCreateAutomation()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7c5cff_0%,#c04bf7_100%)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                <Mic className="h-4 w-4" />
                {submittingAutomation ? "Creating..." : "Create call automation"}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {automations.map((automation) => (
              <div key={automation.id} className="rounded-[24px] border border-[#ece5ff] bg-white/85 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-[#26324f]">{automation.name}</div>
                    <div className="mt-1 text-sm text-[#7280ad]">{automation.audienceType} · {automation.triggerType.replaceAll("_", " ")} · {automation.voiceProfile || "Default voice"}</div>
                  </div>
                  <button type="button" onClick={() => void toggleAutomationStatus(automation.id, automation.status)} className="rounded-full border border-[#eadfff] bg-[#f7f2ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a78cb]">
                    {automation.status}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#5c688d]">
                  <span className="rounded-full bg-[#fbf9ff] px-3 py-1">Schedule: {automation.scheduleSummary || "Manual trigger"}</span>
                  <span className="rounded-full bg-[#fbf9ff] px-3 py-1">Escalation: {automation.escalationEnabled ? "On" : "Off"}</span>
                  <span className="rounded-full bg-[#fbf9ff] px-3 py-1">Created by {automation.createdByUser?.name || "Admin"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
