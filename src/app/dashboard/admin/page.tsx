"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileText,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react"

type DashboardWorkOrder = {
  id: string
  title?: string | null
  workOrderNumber?: string | null
  status: string
  serviceType?: string | null
  dueDate?: string | null
  createdAt?: string
  updatedAt?: string
  city?: string | null
  state?: string | null
  client?: {
    name?: string | null
    company?: string | null
  } | null
  assignedContractor?: {
    name?: string | null
  } | null
}

type DashboardInvoice = {
  id: string
  invoiceNumber?: string | null
  status: string
  clientTotal?: number
  invoiceDate?: string | null
  createdAt?: string
  workOrder?: {
    title?: string | null
    workOrderNumber?: string | null
    client?: {
      name?: string | null
      company?: string | null
    } | null
  } | null
}

type DashboardUser = {
  id: string
  role: string
}

type DashboardMessage = {
  id: string
  content: string
  createdAt?: string
  workOrder?: {
    title?: string | null
    workOrderNumber?: string | null
  } | null
}

type DashboardActivity = {
  id: string
  type: string
  message: string
  timestamp: string
  status: "success" | "info" | "warning" | "error"
}

type MetricCardProps = {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
}

const trackedStatusDefs = [
  { key: "UNASSIGNED", label: "Unassigned", color: "#d9ec4f" },
  { key: "ASSIGNED", label: "Assigned", color: "#ffb47d" },
  { key: "FIELD_COMPLETE", label: "Field Complete", color: "#97a9ff" },
  { key: "OFFICE_APPROVED", label: "Office Approved", color: "#d2a8ef" },
] as const

const activeOpenStatuses = new Set([
  "NEW",
  "UNASSIGNED",
  "IN_PROGRESS",
  "ASSIGNED",
  "READ",
  "FIELD_COMPLETE",
  "OFFICE_APPROVED",
  "SENT_TO_CLIENT",
])

const completedStatuses = new Set(["COMPLETED", "FIELD_COMPLETE", "OFFICE_APPROVED", "CLOSED"])

function formatMoney(value: number) {
  return `$${value.toLocaleString()}`
}

function formatRelativeTime(value?: string) {
  if (!value) return "Recently"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recently"

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)))
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
}

function getActivityIcon(type: string) {
  switch (type) {
    case "work_order_completed":
      return CheckCircle2
    case "new_work_order":
      return FileText
    case "contractor_assigned":
      return Users
    case "payment_received":
      return DollarSign
    case "new_message":
      return MessageSquare
    default:
      return AlertCircle
  }
}

function getActivityColor(status: DashboardActivity["status"]) {
  switch (status) {
    case "success":
      return "text-[#7ee0a6]"
    case "info":
      return "text-[#8fb0ff]"
    case "warning":
      return "text-[#ffd08a]"
    case "error":
      return "text-[#ff9f8f]"
    default:
      return "text-[#aab4d6]"
  }
}

function MetricCard({ title, value, icon: Icon, iconColor }: MetricCardProps) {
  return (
    <div className="rounded-[26px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f6f3ff_100%)] p-5 shadow-[0_18px_40px_rgba(196,186,255,0.22)]">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(240,233,255,0.95))] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div>
          <div className="text-sm font-medium text-[#7a86b3]">{title}</div>
          <div className="mt-1 text-[2rem] font-semibold leading-none text-[#26324f]">{value}</div>
        </div>
      </div>
    </div>
  )
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] shadow-[0_18px_40px_rgba(196,186,255,0.18)]">
      <div className="border-b border-[#ece6ff] px-6 py-5">
        <h3 className="text-xl font-semibold text-[#26324f]">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-[#7a86b3]">{subtitle}</p> : null}
      </div>
      <div className="p-6">{children}</div>
    </section>
  )
}

function DonutCard({
  title,
  values,
}: {
  title: string
  values: { label: string; value: number; color: string }[]
}) {
  const total = values.reduce((sum, item) => sum + item.value, 0)
  let running = 0
  const gradient = values
    .map((item) => {
      const start = total ? (running / total) * 100 : 0
      running += item.value
      const end = total ? (running / total) * 100 : 0
      return `${item.color} ${start}% ${end}%`
    })
    .join(", ")

  return (
    <div className="min-w-0 rounded-[24px] border border-[#e6e0ff] bg-[linear-gradient(180deg,#ffffff_0%,#f7f4ff_100%)] p-5 shadow-[0_12px_30px_rgba(196,186,255,0.14)]">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="text-base font-semibold text-[#26324f]">{title}</div>
          <div className="mt-1 text-sm text-[#7a86b3]">{total} tracked orders</div>
        </div>
        <div className="rounded-full border border-[#e5ddff] bg-[linear-gradient(135deg,#fff7fe_0%,#eef4ff_100%)] px-3 py-1 text-xs font-medium text-[#7a69cc]">
          Live split
        </div>
      </div>
      <div className="flex flex-col items-center gap-5 2xl:flex-row 2xl:items-center">
        <div
          className="relative h-44 w-44 shrink-0 rounded-full"
          style={{
            background: total ? `conic-gradient(${gradient})` : "#ddd9ff",
          }}
        >
          <div className="absolute inset-[24px] rounded-full bg-[linear-gradient(180deg,#ffffff_0%,#f7f4ff_100%)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8da1cf]">Total</div>
              <div className="mt-1 text-3xl font-semibold text-[#26324f]">{total}</div>
            </div>
          </div>
        </div>
        <div className="grid w-full min-w-0 gap-3">
          {values.map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-2xl border border-[#ebe5ff] bg-[linear-gradient(180deg,#ffffff_0%,#f9f6ff_100%)] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-[#435072]">{item.label}</span>
              </div>
              <span className="text-sm font-semibold text-[#26324f]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusTable({
  rows,
}: {
  rows: { label: string; pastDue: number; future: number; total: number; color: string }[]
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#e6e0ff] bg-[linear-gradient(180deg,#ffffff_0%,#faf8ff_100%)]">
      <table className="min-w-full divide-y divide-[#eee8ff]">
        <thead className="bg-[linear-gradient(180deg,#f7f3ff_0%,#eef4ff_100%)]">
          <tr className="text-left text-xs uppercase tracking-[0.16em] text-[#7a86b3]">
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Past Due</th>
            <th className="px-5 py-4">Future</th>
            <th className="px-5 py-4">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eee8ff]">
          {rows.map((row) => (
            <tr key={row.label} className="text-sm text-[#435072]">
              <td className="px-5 py-4 font-medium">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                  {row.label}
                </span>
              </td>
              <td className="px-5 py-4">{row.pastDue}</td>
              <td className="px-5 py-4">{row.future}</td>
              <td className="px-5 py-4 font-semibold text-[#26324f]">{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClientTable({
  rows,
}: {
  rows: Array<{
    client: string
    counts: Record<string, number>
    total: number
  }>
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#e6e0ff] bg-[linear-gradient(180deg,#ffffff_0%,#faf8ff_100%)]">
      <table className="min-w-full divide-y divide-[#eee8ff]">
        <thead className="bg-[linear-gradient(180deg,#f7f3ff_0%,#eef4ff_100%)]">
          <tr className="text-left text-xs uppercase tracking-[0.16em] text-[#7a86b3]">
            <th className="px-5 py-4">Client</th>
            {trackedStatusDefs.map((status) => (
              <th key={status.key} className="px-5 py-4">
                <span style={{ color: status.color }}>{status.label}</span>
              </th>
            ))}
            <th className="px-5 py-4">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eee8ff] text-sm text-[#435072]">
          {rows.map((row) => (
            <tr key={row.client}>
              <td className="px-5 py-4 font-medium text-[#26324f]">{row.client}</td>
              {trackedStatusDefs.map((status) => (
                <td key={status.key} className="px-5 py-4">{row.counts[status.key] || 0}</td>
              ))}
              <td className="px-5 py-4 font-semibold text-[#26324f]">{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HorizontalStackList({
  title,
  rows,
}: {
  title: string
  rows: Array<{
    label: string
    values: { key: string; value: number; color: string }[]
  }>
}) {
  const maxTotal = Math.max(1, ...rows.map((row) => row.values.reduce((sum, item) => sum + item.value, 0)))

  return (
    <div className="rounded-[24px] border border-[#e6e0ff] bg-[linear-gradient(180deg,#ffffff_0%,#f7f4ff_100%)] p-5 shadow-[0_12px_30px_rgba(196,186,255,0.14)]">
      <div className="mb-4 text-base font-semibold text-[#26324f]">{title}</div>
      <div className="space-y-4">
        {rows.map((row) => {
          const total = row.values.reduce((sum, item) => sum + item.value, 0)
          return (
            <div key={row.label}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-[#435072]">{row.label}</span>
                <span className="text-[#7a86b3]">{total}</span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-[#ece8ff]">
                {row.values.map((item) => (
                  <div
                    key={`${row.label}-${item.key}`}
                    style={{
                      width: `${(item.value / maxTotal) * 100}%`,
                      backgroundColor: item.color,
                    }}
                    title={`${item.key}: ${item.value}`}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-3 text-xs text-[#7a86b3]">
        {trackedStatusDefs.map((status) => (
          <span key={status.key} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
            {status.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function AgingTable({
  rows,
}: {
  rows: Array<{
    client: string
    lt30: number
    d30to60: number
    d60to90: number
    d90plus: number
  }>
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#e6e0ff] bg-[linear-gradient(180deg,#ffffff_0%,#faf8ff_100%)]">
      <table className="min-w-full divide-y divide-[#eee8ff]">
        <thead className="bg-[linear-gradient(180deg,#f7f3ff_0%,#eef4ff_100%)]">
          <tr className="text-left text-xs uppercase tracking-[0.16em] text-[#7a86b3]">
            <th className="px-5 py-4">Client</th>
            <th className="px-5 py-4">&lt; 30 Days</th>
            <th className="px-5 py-4">30 - 60 Days</th>
            <th className="px-5 py-4">60 - 90 Days</th>
            <th className="px-5 py-4">90+ Days</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eee8ff] text-sm text-[#435072]">
          {rows.map((row) => (
            <tr key={row.client}>
              <td className="px-5 py-4 font-medium text-[#26324f]">{row.client}</td>
              <td className="px-5 py-4">{formatMoney(row.lt30)}</td>
              <td className="px-5 py-4">{formatMoney(row.d30to60)}</td>
              <td className="px-5 py-4">{formatMoney(row.d60to90)}</td>
              <td className="px-5 py-4 font-semibold text-[#d47d2a]">{formatMoney(row.d90plus)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminDashboard() {
  const [workOrders, setWorkOrders] = useState<DashboardWorkOrder[]>([])
  const [users, setUsers] = useState<DashboardUser[]>([])
  const [invoices, setInvoices] = useState<DashboardInvoice[]>([])
  const [messages, setMessages] = useState<DashboardMessage[]>([])
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([])

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [workOrdersResponse, usersResponse, invoicesResponse, messagesResponse] = await Promise.all([
          fetch("/api/work-orders"),
          fetch("/api/users"),
          fetch("/api/admin/invoices"),
          fetch("/api/messages"),
        ])

        const nextWorkOrders: DashboardWorkOrder[] = workOrdersResponse.ok ? await workOrdersResponse.json() : []
        const nextUsers: DashboardUser[] = usersResponse.ok ? await usersResponse.json() : []
        const invoicesPayload = invoicesResponse.ok ? await invoicesResponse.json() : { invoices: [] }
        const nextInvoices: DashboardInvoice[] = Array.isArray(invoicesPayload?.invoices) ? invoicesPayload.invoices : []
        const messagesPayload = messagesResponse.ok ? await messagesResponse.json() : { data: [] }
        const nextMessages: DashboardMessage[] = Array.isArray(messagesPayload?.data)
          ? messagesPayload.data
          : Array.isArray(messagesPayload)
            ? messagesPayload
            : []

        setWorkOrders(nextWorkOrders)
        setUsers(nextUsers)
        setInvoices(nextInvoices)
        setMessages(nextMessages)

        const activityItems: DashboardActivity[] = [
          ...nextWorkOrders.slice(0, 4).map((order) => ({
            id: `wo-${order.id}`,
            type: completedStatuses.has(order.status) ? "work_order_completed" : "new_work_order",
            message: completedStatuses.has(order.status)
              ? `Work Order ${order.workOrderNumber || order.id} completed${order.assignedContractor?.name ? ` by ${order.assignedContractor.name}` : ""}`
              : `New work order ${order.workOrderNumber || order.id} created`,
            timestamp: formatRelativeTime(order.updatedAt || order.createdAt),
            status: completedStatuses.has(order.status) ? "success" as const : "info" as const,
          })),
          ...nextMessages.slice(0, 4).map((message) => ({
            id: `msg-${message.id}`,
            type: "new_message",
            message: `New message on ${message.workOrder?.workOrderNumber || message.workOrder?.title || "work order"}: ${message.content.length > 90 ? `${message.content.slice(0, 90)}...` : message.content}`,
            timestamp: formatRelativeTime(message.createdAt),
            status: "info" as const,
          })),
          ...nextInvoices.slice(0, 4).map((invoice) => ({
            id: `inv-${invoice.id}`,
            type: "payment_received",
            message:
              invoice.status === "PAID"
                ? `Payment received for invoice #${invoice.invoiceNumber || invoice.id}`
                : `Invoice #${invoice.invoiceNumber || invoice.id} is ${invoice.status.toLowerCase()}`,
            timestamp: formatRelativeTime(invoice.createdAt),
            status: invoice.status === "PAID" ? "success" as const : "warning" as const,
          })),
        ].slice(0, 8)

        setRecentActivity(activityItems)
      } catch (error) {
        console.error("Failed to load admin dashboard data:", error)
      }
    }

    loadDashboardData()
  }, [])

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)

  const trackedOrders = workOrders.filter((order) => trackedStatusDefs.some((status) => status.key === order.status))
  const openOrders = workOrders.filter((order) => activeOpenStatuses.has(order.status))
  const paidInvoicesThisMonth = invoices.filter((invoice) => {
    if (invoice.status !== "PAID") return false
    const date = new Date(invoice.createdAt || invoice.invoiceDate || "")
    return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })

  const stats = {
    totalWorkOrders: workOrders.length,
    pendingAssignments: workOrders.filter((order) => !order.assignedContractor?.name || order.status === "NEW" || order.status === "UNASSIGNED").length,
    activeContractors: users.filter((user) => user.role === "CONTRACTOR").length,
    monthlyRevenue: paidInvoicesThisMonth.reduce((sum, invoice) => sum + (Number(invoice.clientTotal) || 0), 0),
    completedThisWeek: workOrders.filter((order) => {
      if (!completedStatuses.has(order.status)) return false
      const updatedAt = new Date(order.updatedAt || "")
      return !Number.isNaN(updatedAt.getTime()) && updatedAt >= weekStart
    }).length,
    overdueJobs: workOrders.filter((order) => {
      if (!order.dueDate) return false
      if (!activeOpenStatuses.has(order.status)) return false
      const dueDate = new Date(order.dueDate)
      return !Number.isNaN(dueDate.getTime()) && dueDate < now
    }).length,
  }

  const ordersByStatus = trackedStatusDefs.map((status) => {
    const matching = trackedOrders.filter((order) => order.status === status.key)
    const pastDue = matching.filter((order) => {
      const dueDate = order.dueDate ? new Date(order.dueDate) : null
      return dueDate && !Number.isNaN(dueDate.getTime()) && dueDate < now
    }).length
    const future = matching.length - pastDue
    return {
      label: status.label,
      color: status.color,
      pastDue,
      future,
      total: matching.length,
    }
  })

  const pastDueDonut = ordersByStatus.map((row) => ({ label: row.label, value: row.pastDue, color: row.color }))
  const futureDonut = ordersByStatus.map((row) => ({ label: row.label, value: row.future, color: row.color }))

  const clientMap = new Map<string, Record<string, number>>()
  trackedOrders.forEach((order) => {
    const clientName = order.client?.company || order.client?.name || "Unassigned Client"
    if (!clientMap.has(clientName)) {
      clientMap.set(
        clientName,
        Object.fromEntries(trackedStatusDefs.map((status) => [status.key, 0]))
      )
    }
    clientMap.get(clientName)![order.status] = (clientMap.get(clientName)![order.status] || 0) + 1
  })

  const clientRows = [...clientMap.entries()]
    .map(([client, counts]) => ({
      client,
      counts,
      total: Object.values(counts).reduce((sum, value) => sum + value, 0),
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  const dueDateRows = clientRows.map((row) => {
    const relevantOrders = trackedOrders.filter((order) => (order.client?.company || order.client?.name || "Unassigned Client") === row.client)
    const pastDue = relevantOrders.filter((order) => order.dueDate && new Date(order.dueDate) < now).length
    const future = relevantOrders.length - pastDue
    return { client: row.client, pastDue, future, total: relevantOrders.length }
  })

  const openInvoices = invoices.filter((invoice) => invoice.status !== "PAID")
  const invoiceAgingMap = new Map<string, { lt30: number; d30to60: number; d60to90: number; d90plus: number }>()

  openInvoices.forEach((invoice) => {
    const client = invoice.workOrder?.client?.company || invoice.workOrder?.client?.name || "Unknown Client"
    const amount = Number(invoice.clientTotal) || 0
    const invoiceDate = new Date(invoice.invoiceDate || invoice.createdAt || "")
    const ageDays = Number.isNaN(invoiceDate.getTime()) ? 0 : Math.floor((now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))

    if (!invoiceAgingMap.has(client)) {
      invoiceAgingMap.set(client, { lt30: 0, d30to60: 0, d60to90: 0, d90plus: 0 })
    }

    const row = invoiceAgingMap.get(client)!
    if (ageDays < 30) row.lt30 += amount
    else if (ageDays < 60) row.d30to60 += amount
    else if (ageDays < 90) row.d60to90 += amount
    else row.d90plus += amount
  })

  const invoiceRows = [...invoiceAgingMap.entries()]
    .map(([client, amounts]) => ({ client, ...amounts }))
    .sort((a, b) => (b.lt30 + b.d30to60 + b.d60to90 + b.d90plus) - (a.lt30 + a.d30to60 + a.d60to90 + a.d90plus))
    .slice(0, 10)

  const invoiceBarRows = invoiceRows.map((row) => ({
    label: row.client,
    values: [
      { key: "<30", value: row.lt30, color: "#8fb0ff" },
      { key: "30-60", value: row.d30to60, color: "#d9ec4f" },
      { key: "60-90", value: row.d60to90, color: "#ffb47d" },
      { key: "90+", value: row.d90plus, color: "#d2a8ef" },
    ],
  }))

  return (
    <div className="space-y-6 text-[#435072]">
      <section className="rounded-[30px] border border-[#e3dcff] bg-[radial-gradient(circle_at_top_left,rgba(255,116,194,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(123,167,255,0.16),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f6f2ff_100%)] px-7 py-7 shadow-[0_20px_50px_rgba(196,186,255,0.2)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#c45fcb]">Operations Board</p>
            <h2 className="mt-2 text-4xl font-semibold text-[#26324f]">Admin Dashboard</h2>
            <p className="mt-3 max-w-3xl text-base text-[#6f7ca9]">
              Live view of work order load, client distribution, invoice aging, and the orders that need the fastest attention.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin/work-orders"
              className="inline-flex items-center rounded-2xl border border-[#f1c8ff] bg-[linear-gradient(135deg,#ffeffa_0%,#e8f0ff_100%)] px-5 py-3 text-sm font-medium text-[#a635bf] shadow-[0_12px_28px_rgba(216,144,255,0.22)]"
            >
              <FileText className="mr-2 h-4 w-4" />
              Manage Work Orders
            </Link>
            <Link
              href="/dashboard/admin/billing"
              className="inline-flex items-center rounded-2xl border border-[#dce7ff] bg-[linear-gradient(135deg,#ffffff_0%,#eef4ff_100%)] px-5 py-3 text-sm font-medium text-[#4967b3] shadow-[0_10px_24px_rgba(155,180,255,0.18)] hover:border-[#cfdcff]"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Review Billing
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Total Work Orders" value={stats.totalWorkOrders} icon={FileText} iconColor="text-[#ffb487]" />
        <MetricCard title="Pending Assignment" value={stats.pendingAssignments} icon={Clock3} iconColor="text-[#ffd08a]" />
        <MetricCard title="Active Contractors" value={stats.activeContractors} icon={Users} iconColor="text-[#8fb0ff]" />
        <MetricCard title="Monthly Revenue" value={formatMoney(stats.monthlyRevenue)} icon={TrendingUp} iconColor="text-[#7ee0a6]" />
        <MetricCard title="Completed This Week" value={stats.completedThisWeek} icon={CheckCircle2} iconColor="text-[#7ee0a6]" />
        <MetricCard title="Overdue Jobs" value={stats.overdueJobs} icon={AlertCircle} iconColor="text-[#ff9f8f]" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_.75fr_.75fr]">
        <SectionCard title="Open Orders by Status" subtitle="Tracked status groups split into past due and future work">
          <StatusTable rows={ordersByStatus} />
        </SectionCard>
        <DonutCard title="Past Due" values={pastDueDonut} />
        <DonutCard title="Future" values={futureDonut} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <SectionCard title="Open Orders by Client" subtitle="Top clients by tracked order volume">
          <ClientTable rows={clientRows} />
        </SectionCard>
        <HorizontalStackList
          title="Client Load Distribution"
          rows={clientRows.map((row) => ({
            label: row.client,
            values: trackedStatusDefs.map((status) => ({
              key: status.label,
              value: row.counts[status.key] || 0,
              color: status.color,
            })),
          }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <SectionCard title="Open Orders by Date" subtitle="Past-due pressure versus future pipeline by client">
          <div className="overflow-hidden rounded-[24px] border border-[#e6e0ff] bg-[linear-gradient(180deg,#ffffff_0%,#faf8ff_100%)]">
            <table className="min-w-full divide-y divide-[#eee8ff]">
              <thead className="bg-[linear-gradient(180deg,#f7f3ff_0%,#eef4ff_100%)]">
                <tr className="text-left text-xs uppercase tracking-[0.16em] text-[#7a86b3]">
                  <th className="px-5 py-4">Client</th>
                  <th className="px-5 py-4">Past Due</th>
                  <th className="px-5 py-4">Future</th>
                  <th className="px-5 py-4">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee8ff] text-sm text-[#435072]">
                {dueDateRows.map((row) => (
                  <tr key={row.client}>
                    <td className="px-5 py-4 font-medium text-[#26324f]">{row.client}</td>
                    <td className="px-5 py-4 text-[#d47d2a]">{row.pastDue}</td>
                    <td className="px-5 py-4 text-[#5877d8]">{row.future}</td>
                    <td className="px-5 py-4 font-semibold text-[#26324f]">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
        <div className="grid gap-6 2xl:grid-cols-2">
          <DonutCard
            title="Past Due by Client"
            values={dueDateRows.slice(0, 6).map((row, index) => ({
              label: row.client,
              value: row.pastDue,
              color: ["#d9ec4f", "#36b0c6", "#c26ad9", "#ffd15e", "#5f8cff", "#ff9c78"][index % 6],
            }))}
          />
          <DonutCard
            title="Future by Client"
            values={dueDateRows.slice(0, 6).map((row, index) => ({
              label: row.client,
              value: row.future,
              color: ["#36b0c6", "#ffd15e", "#c26ad9", "#d9ec4f", "#97a9ff", "#ffb47d"][index % 6],
            }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <SectionCard title="Open Invoices" subtitle="Aging buckets for unpaid invoice balances">
          <AgingTable rows={invoiceRows} />
        </SectionCard>
        <HorizontalStackList title="Open Invoice Exposure" rows={invoiceBarRows} />
      </div>

      <SectionCard title="Recent Activity" subtitle="Latest system events and updates">
        <div className="space-y-4">
          {recentActivity.map((activity) => {
            const ActivityIcon = getActivityIcon(activity.type)
            return (
              <div key={activity.id} className="flex items-start gap-4 rounded-[22px] border border-[#ebe5ff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] px-5 py-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fff7fe_0%,#edf3ff_100%)]">
                  <ActivityIcon className={`h-5 w-5 ${getActivityColor(activity.status)}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-6 text-[#435072]">{activity.message}</div>
                  <div className="mt-1 text-sm text-[#7a86b3]">{activity.timestamp}</div>
                </div>
              </div>
            )
          })}
          {recentActivity.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[#ddd4ff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] px-5 py-8 text-center text-[#7a86b3]">
              No activity yet.
            </div>
          ) : null}
        </div>
      </SectionCard>
    </div>
  )
}
