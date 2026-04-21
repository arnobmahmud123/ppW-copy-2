"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { 
  DollarSign, 
  Search,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  FileText
} from "lucide-react"

interface Invoice {
  id: string
  workOrderId: string
  status: string
  clientTotal?: number
  amountCents?: number
  currency?: string
  invoiceNumber?: string
  invoiceDate?: string
  issuedAt?: string
  paidAt?: string
  createdAt: string
  workOrder: {
    title: string
    client: {
      name: string
      company?: string
    }
  }
}

interface FinanceInsights {
  overview: {
    totalInvoicedRevenue: number
    totalEstimatedRevenue: number
    totalContractorSpend: number
    totalEstimatedProfit: number
    estimatedMarginPercent: number
    totalChargebacks: number
    totalMaterialCost: number
    totalPaid: number
    totalPending: number
    invoiceCount: number
    averageInvoice: number
  }
  vendorEarnings: Array<{
    name: string
    activeOrders: number
    estimatedSpend: number
    estimatedRevenue: number
    estimatedProfit: number
    materialCost: number
    chargebacks: number
    paidRevenue: number
    marginPercent: number
  }>
}

export default function AdminBilling() {
  useSession()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [insights, setInsights] = useState<FinanceInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  const getInvoiceAmount = (invoice: Invoice) => {
    if (typeof invoice.clientTotal === "number" && Number.isFinite(invoice.clientTotal)) {
      return invoice.clientTotal
    }

    if (typeof invoice.amountCents === "number" && Number.isFinite(invoice.amountCents)) {
      return invoice.amountCents / 100
    }

    return 0
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount || 0)

  useEffect(() => {
    void Promise.all([fetchInvoices(), fetchInsights()])
  }, [])

  const fetchInvoices = async () => {
    try {
      const response = await fetch("/api/admin/invoices")
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices)
      }
    } catch (error) {
      console.error("Error fetching invoices:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInsights = async () => {
    try {
      const response = await fetch("/api/admin/finance-insights")
      if (response.ok) {
        const data = await response.json()
        setInsights(data)
      }
    } catch (error) {
      console.error("Error fetching finance insights:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800"
      case "SENT":
        return "bg-blue-100 text-blue-800"
      case "DRAFT":
        return "bg-gray-100 text-gray-800"
      case "VOID":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PAID":
        return CheckCircle
      case "SENT":
        return Clock
      case "VOID":
        return XCircle
      default:
        return FileText
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.workOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.workOrder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.workOrder.client.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "ALL" || invoice.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const totalRevenue = insights?.overview.totalPaid ?? invoices
    .filter(invoice => invoice.status === "PAID")
    .reduce((sum, invoice) => sum + getInvoiceAmount(invoice), 0)

  const pendingAmount = insights?.overview.totalPending ?? invoices
    .filter(invoice => invoice.status === "SENT")
    .reduce((sum, invoice) => sum + getInvoiceAmount(invoice), 0)

  const handleExportReport = () => {
    const csvRows = [
      ["Invoice Number", "Invoice ID", "Work Order", "Client", "Status", "Amount", "Invoice Date", "Created At"],
      ...filteredInvoices.map((invoice) => [
        invoice.invoiceNumber || "",
        invoice.id,
        invoice.workOrder.title,
        invoice.workOrder.client.name,
        invoice.status,
        getInvoiceAmount(invoice).toFixed(2),
        invoice.invoiceDate || invoice.issuedAt || "",
        invoice.createdAt,
      ]),
    ]

    const csvContent = csvRows
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `billing-report-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleDownloadInvoice = (invoice: Invoice) => {
    const invoiceAmount = getInvoiceAmount(invoice)
    const lines = [
      "Invoice Summary",
      `Invoice Number: ${invoice.invoiceNumber || "-"}`,
      `Invoice ID: ${invoice.id}`,
      `Work Order: ${invoice.workOrder.title}`,
      `Work Order ID: ${invoice.workOrderId}`,
      `Client: ${invoice.workOrder.client.name}`,
      `Client Company: ${invoice.workOrder.client.company || "-"}`,
      `Status: ${invoice.status}`,
      `Amount: ${formatCurrency(invoiceAmount)}`,
      `Invoice Date: ${invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : "-"}`,
      `Created: ${new Date(invoice.createdAt).toLocaleDateString()}`,
    ]

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${invoice.invoiceNumber || invoice.id}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#ff6b3c]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-[#435072]">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-[#2b3159] sm:text-3xl sm:truncate">
            Billing & Invoices
          </h2>
          <p className="mt-1 text-sm text-[#7280ad]">
            Manage invoices, payments, and financial reporting
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={handleExportReport}
            className="inline-flex items-center rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-4 py-2 text-sm font-medium text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="overflow-hidden rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] shadow-[0_16px_36px_rgba(196,186,255,0.14)]">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-[#7ee0a6]" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[#7280ad] truncate">
                    Paid Revenue
                  </dt>
                  <dd className="text-lg font-medium text-[#2b3159]">
                    {formatCurrency(totalRevenue)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] shadow-[0_16px_36px_rgba(196,186,255,0.14)]">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-[#ffd08a]" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[#7280ad] truncate">
                    Pending Payments
                  </dt>
                  <dd className="text-lg font-medium text-[#2b3159]">
                    {formatCurrency(pendingAmount)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] shadow-[0_16px_36px_rgba(196,186,255,0.14)]">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-[#8fb0ff]" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[#7280ad] truncate">
                    Total Invoices
                  </dt>
                  <dd className="text-lg font-medium text-[#2b3159]">
                    {invoices.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] shadow-[0_16px_36px_rgba(196,186,255,0.14)]">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-[#ef7b49]" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[#7280ad] truncate">
                    Est. Profit
                  </dt>
                  <dd className="text-lg font-medium text-[#2b3159]">
                    {formatCurrency(insights?.overview.totalEstimatedProfit ?? 0)}
                  </dd>
                  <dd className="text-xs text-[#8a78cb]">
                    Margin {(insights?.overview.estimatedMarginPercent ?? 0).toFixed(1)}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {insights ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
          <div className="rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] p-5 shadow-[0_16px_36px_rgba(196,186,255,0.14)]">
            <h3 className="text-lg font-semibold text-[#2b3159]">Financial intelligence</h3>
            <p className="mt-1 text-sm text-[#7280ad]">Profit, contractor cost, material exposure, and chargeback pressure from live work-order pricing data.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Estimated revenue", formatCurrency(insights.overview.totalEstimatedRevenue)],
                ["Contractor spend", formatCurrency(insights.overview.totalContractorSpend)],
                ["Material cost", formatCurrency(insights.overview.totalMaterialCost)],
                ["Chargebacks", formatCurrency(insights.overview.totalChargebacks)],
                ["Average invoice", formatCurrency(insights.overview.averageInvoice)],
                ["Invoice count", String(insights.overview.invoiceCount)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[20px] border border-[#ece5ff] bg-white/85 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8da1cf]">{label}</div>
                  <div className="mt-1 text-lg font-semibold text-[#2b3159]">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] p-5 shadow-[0_16px_36px_rgba(196,186,255,0.14)]">
            <h3 className="text-lg font-semibold text-[#2b3159]">Vendor earnings summary</h3>
            <p className="mt-1 text-sm text-[#7280ad]">Active orders, spend, revenue, and estimated profit by vendor/contractor.</p>
            <div className="mt-4 space-y-3">
              {insights.vendorEarnings.slice(0, 8).map((vendor) => (
                <div key={vendor.name} className="grid gap-2 rounded-[20px] border border-[#ece5ff] bg-white/85 px-4 py-4 md:grid-cols-[1.3fr,0.6fr,0.8fr,0.8fr,0.7fr] md:items-center">
                  <div>
                    <div className="text-sm font-semibold text-[#2b3159]">{vendor.name}</div>
                    <div className="mt-1 text-xs text-[#7280ad]">{vendor.activeOrders} active orders</div>
                  </div>
                  <div className="text-sm font-medium text-[#435072]">{formatCurrency(vendor.estimatedSpend)}</div>
                  <div className="text-sm font-medium text-[#ef7b49]">{formatCurrency(vendor.estimatedRevenue)}</div>
                  <div className="text-sm font-medium text-[#2f9b67]">{formatCurrency(vendor.estimatedProfit)}</div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a78cb]">{vendor.marginPercent.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Search and Filters */}
      <div className="rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] p-4 shadow-[0_16px_36px_rgba(196,186,255,0.14)]">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#7f8ab0]" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-[#e2dbff] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] py-2 pl-10 pr-4 text-[#2b3159] outline-none"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-2xl border border-[#e2dbff] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] px-3 py-2 text-[#2b3159] outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PAID">Paid</option>
              <option value="VOID">Void</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="overflow-hidden rounded-[28px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
        <div className="border-b border-[#ebe5ff] px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-[#2b3159]">
            Invoices
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#eee8ff]">
            <thead className="bg-[linear-gradient(180deg,#f7f3ff_0%,#eef4ff_100%)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9aa6cc]">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issued
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee8ff] bg-transparent">
              {filteredInvoices.map((invoice) => {
                const StatusIcon = getStatusIcon(invoice.status)
                return (
                  <tr key={invoice.id} className="hover:bg-[#faf7ff]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <StatusIcon className="mr-3 h-5 w-5 text-[#7f8ab0]" />
                        <div>
                          <div className="text-sm font-medium text-[#2b3159]">
                            {invoice.invoiceNumber || invoice.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#435072]">
                      {invoice.workOrderId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[#edf2ff]">{invoice.workOrder.client.name}</div>
                      {invoice.workOrder.client.company && (
                        <div className="text-sm text-[#9aa6cc]">{invoice.workOrder.client.company}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#edf2ff]">
                      {formatCurrency(getInvoiceAmount(invoice))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#edf2ff]">
                      {new Date(invoice.invoiceDate || invoice.issuedAt || invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/dashboard/admin/work-orders/${invoice.workOrderId}?subTab=invoice`}
                          className="text-[#8fb0ff] hover:text-[#bfd3ff]"
                          title="View invoice"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDownloadInvoice(invoice)}
                          className="text-[#7ee0a6] hover:text-[#a6f0c2]"
                          title="Download invoice summary"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-12 w-12 text-[#7f8ab0]" />
            <h3 className="mt-2 text-sm font-medium text-white">No invoices found</h3>
            <p className="mt-1 text-sm text-[#9aa6cc]">
              {searchTerm || statusFilter !== "ALL"
                ? "Try adjusting your search or filter criteria."
                : "Invoices will appear here once work orders are completed and billed."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
