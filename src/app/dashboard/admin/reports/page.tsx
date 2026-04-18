"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { 
  FileText, 
  Download,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart,
  Filter,
  RefreshCw
} from "lucide-react"

interface MonthlyStat {
  month: string
  workOrders: number
  revenue: number
}

interface ReportData {
  totalWorkOrders: number
  completedWorkOrders: number
  totalRevenue: number
  activeContractors: number
  monthlyStats: MonthlyStat[]
}

interface FinancialReportData {
  revenueData: Array<{
    status: string
    _sum: { clientTotal: number | null }
    _count: { id: number }
  }>
  invoiceStats: {
    _sum: { clientTotal: number | null }
    _avg: { clientTotal: number | null }
    _count: { id: number }
  }
  outstandingInvoices: Array<{
    id: string
    invoiceNumber: string
    clientTotal: number
    status: string
    invoiceDate: string
    workOrder: {
      title: string
      client: {
        name: string
        company: string | null
      }
    }
  }>
}

interface OperationalReportData {
  workOrderStats: { _count: { id: number } }
  statusBreakdown: Array<{
    status: string
    _count: { id: number }
  }>
  serviceTypeBreakdown: Array<{
    serviceType: string
    _count: { id: number }
  }>
  averageCompletionTime: number
}

interface ContractorPerformanceData {
  contractorPerformance: Array<{
    contractor: {
      id: string
      name: string
      email: string
      company: string | null
    } | null
    totalOrders: number
    completedOrders: number
    completionRate: number
  }>
}

export default function AdminReports() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [reportData, setReportData] = useState<ReportData>({
    totalWorkOrders: 0,
    completedWorkOrders: 0,
    totalRevenue: 0,
    activeContractors: 0,
    monthlyStats: []
  })
  const [financialData, setFinancialData] = useState<FinancialReportData | null>(null)
  const [operationalData, setOperationalData] = useState<OperationalReportData | null>(null)
  const [contractorData, setContractorData] = useState<ContractorPerformanceData | null>(null)
  
  // Date filtering
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: ""
  })
  const [showDateFilter, setShowDateFilter] = useState(false)

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const fetchReportData = async (type: string = "overview") => {
    try {
      if (type === "overview" || type === "all") {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const params = new URLSearchParams()
      if (dateRange.startDate) params.append("startDate", dateRange.startDate)
      if (dateRange.endDate) params.append("endDate", dateRange.endDate)
      params.append("type", type)

      const response = await fetch(`/api/admin/reports?${params}`)
      if (!response.ok) throw new Error("Failed to fetch report data")
      
      const data = await response.json()

      switch (type) {
        case "overview":
          setReportData(data)
          break
        case "financial":
          setFinancialData(data)
          break
        case "operational":
          setOperationalData(data)
          break
        case "contractor-performance":
          setContractorData(data)
          break
        case "all":
          setReportData(data)
          // Fetch additional data
          await Promise.all([
            fetchReportData("financial"),
            fetchReportData("operational"),
            fetchReportData("contractor-performance")
          ])
          break
      }
    } catch (error) {
      console.error("Error fetching report data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleDateFilterChange = (field: "startDate" | "endDate", value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }

  const clearDateFilter = () => {
    setDateRange({ startDate: "", endDate: "" })
  }

  const handleExportReport = async (type: string) => {
    try {
      const params = new URLSearchParams()
      if (dateRange.startDate) params.append("startDate", dateRange.startDate)
      if (dateRange.endDate) params.append("endDate", dateRange.endDate)
      params.append("type", type)
      params.append("export", "true")

      const response = await fetch(`/api/admin/reports?${params}`)
      if (!response.ok) throw new Error("Failed to export report")
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error exporting report:", error)
    }
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
            Reports & Analytics
          </h2>
          <p className="mt-1 text-sm text-[#7280ad]">
            Comprehensive reporting and business intelligence
            {dateRange.startDate && dateRange.endDate && (
              <span className="ml-2 text-[#cf26dd]">
                • Filtered: {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="inline-flex items-center rounded-2xl border border-[#e2dbff] bg-[linear-gradient(135deg,#ffffff_0%,#eef4ff_100%)] px-4 py-2 text-sm font-medium text-[#4f63b5]"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
          <button
            onClick={() => fetchReportData("all")}
            disabled={refreshing}
            className="inline-flex items-center rounded-2xl border border-[#e2dbff] bg-[linear-gradient(135deg,#ffffff_0%,#eef4ff_100%)] px-4 py-2 text-sm font-medium text-[#4f63b5] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => handleExportReport("financial")}
            className="inline-flex items-center rounded-2xl border border-[#e2dbff] bg-[linear-gradient(135deg,#ffffff_0%,#eef4ff_100%)] px-4 py-2 text-sm font-medium text-[#4f63b5]"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Financial
          </button>
          <button
            onClick={() => handleExportReport("operational")}
            className="inline-flex items-center rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-4 py-2 text-sm font-medium text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Operational
          </button>
        </div>
      </div>

      {/* Date Filter */}
      {showDateFilter && (
        <div className="rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] p-6 shadow-[0_16px_36px_rgba(196,186,255,0.14)]">
          <h3 className="mb-4 text-lg font-medium text-[#2b3159]">Date Range Filter</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#5b6994]">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateFilterChange("startDate", e.target.value)}
                className="mt-1 block w-full rounded-xl border border-[#e2dbff] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] px-3 py-2 text-[#2b3159] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5b6994]">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateFilterChange("endDate", e.target.value)}
                className="mt-1 block w-full rounded-xl border border-[#e2dbff] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] px-3 py-2 text-[#2b3159] sm:text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={clearDateFilter}
                className="w-full inline-flex items-center justify-center rounded-2xl border border-[#e2dbff] bg-[linear-gradient(135deg,#ffffff_0%,#edf4ff_100%)] px-4 py-2 text-sm font-medium text-[#4f63b5]"
              >
                Clear Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="overflow-hidden rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-[#7da2ff]" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[#7280ad] truncate">
                    Total Work Orders
                  </dt>
                  <dd className="text-lg font-medium text-[#2b3159]">
                    {reportData.totalWorkOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-[#57d2a6]" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[#7280ad] truncate">
                    Completion Rate
                  </dt>
                  <dd className="text-lg font-medium text-[#2b3159]">
                    {Math.round((reportData.completedWorkOrders / reportData.totalWorkOrders) * 100)}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-[#ffb35c]" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[#7280ad] truncate">
                    Total Revenue
                  </dt>
                  <dd className="text-lg font-medium text-[#2b3159]">
                    ${reportData.totalRevenue.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-[#ff8a6a]" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[#7280ad] truncate">
                    Active Contractors
                  </dt>
                  <dd className="text-lg font-medium text-[#2b3159]">
                    {reportData.activeContractors}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Reports */}
        <div className="rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] p-6 shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-[#2b3159] flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-[#ffb35c]" />
              Financial Reports
            </h3>
            <button
              onClick={() => fetchReportData("financial")}
              className="text-sm text-[#7da2ff] hover:text-[#a9c0ff]"
            >
              Load Details
            </button>
          </div>
          
          {financialData && (
            <div className="mb-4 space-y-2">
              <div className="text-sm text-[#7280ad]">
                Total Revenue: <span className="font-medium text-[#2b3159]">${financialData.invoiceStats._sum.clientTotal?.toLocaleString() || 0}</span>
              </div>
              <div className="text-sm text-[#7280ad]">
                Average Invoice: <span className="font-medium text-[#2b3159]">${Math.round(financialData.invoiceStats._avg.clientTotal || 0).toLocaleString()}</span>
              </div>
              <div className="text-sm text-[#9aa6cc]">
                Outstanding: <span className="font-medium text-[#ff8a6a]">{financialData.outstandingInvoices.length} invoices</span>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => handleExportReport("financial")}
              className="flex w-full items-center justify-between rounded-2xl border border-[#e2dbff] bg-[linear-gradient(135deg,#ffffff_0%,#f5f8ff_100%)] p-3 text-left transition hover:border-[#d3c9ff] hover:bg-[#faf7ff]"
            >
              <div>
                <div className="font-medium text-[#2b3159]">Revenue Report</div>
                <div className="text-sm text-[#7280ad]">Monthly and yearly revenue analysis</div>
              </div>
              <Download className="h-4 w-4 text-[#7da2ff]" />
            </button>
            <button
              onClick={() => handleExportReport("invoices")}
              className="flex w-full items-center justify-between rounded-2xl border border-[#e2dbff] bg-[linear-gradient(135deg,#ffffff_0%,#f5f8ff_100%)] p-3 text-left transition hover:border-[#d3c9ff] hover:bg-[#faf7ff]"
            >
              <div>
                <div className="font-medium text-[#2b3159]">Invoice Report</div>
                <div className="text-sm text-[#7280ad]">Outstanding and paid invoices</div>
              </div>
              <Download className="h-4 w-4 text-[#7da2ff]" />
            </button>
            <button
              onClick={() => handleExportReport("contractor-payments")}
              className="flex w-full items-center justify-between rounded-2xl border border-[#e2dbff] bg-[linear-gradient(135deg,#ffffff_0%,#f5f8ff_100%)] p-3 text-left transition hover:border-[#d3c9ff] hover:bg-[#faf7ff]"
            >
              <div>
                <div className="font-medium text-[#2b3159]">Contractor Payments</div>
                <div className="text-sm text-[#7280ad]">Payment history and pending amounts</div>
              </div>
              <Download className="h-4 w-4 text-[#7da2ff]" />
            </button>
          </div>
        </div>

        {/* Operational Reports */}
        <div className="rounded-[24px] border border-white/8 bg-[#242c45] p-6 shadow-[0_18px_40px_rgba(7,10,20,0.22)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-[#7da2ff]" />
              Operational Reports
            </h3>
            <button
              onClick={() => fetchReportData("operational")}
              className="text-sm text-[#7da2ff] hover:text-[#a9c0ff]"
            >
              Load Details
            </button>
          </div>
          
          {operationalData && (
            <div className="mb-4 space-y-2">
              <div className="text-sm text-[#9aa6cc]">
                Avg. Completion Time: <span className="font-medium text-white">{operationalData.averageCompletionTime} days</span>
              </div>
              <div className="text-sm text-[#9aa6cc]">
                Status Breakdown: <span className="font-medium text-white">{operationalData.statusBreakdown.length} statuses</span>
              </div>
              <div className="text-sm text-[#9aa6cc]">
                Service Types: <span className="font-medium text-white">{operationalData.serviceTypeBreakdown.length} types</span>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => handleExportReport("operational")}
              className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#1d2438] p-3 text-left transition hover:bg-[#27304a]"
            >
              <div>
                <div className="font-medium text-white">Work Order Report</div>
                <div className="text-sm text-[#9aa6cc]">All work orders with status and details</div>
              </div>
              <Download className="h-4 w-4 text-[#7da2ff]" />
            </button>
            <button
              onClick={() => {
                fetchReportData("contractor-performance")
                handleExportReport("contractor-performance")
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#1d2438] p-3 text-left transition hover:bg-[#27304a]"
            >
              <div>
                <div className="font-medium text-white">Contractor Performance</div>
                <div className="text-sm text-[#9aa6cc]">Job completion rates and quality metrics</div>
              </div>
              <Download className="h-4 w-4 text-[#7da2ff]" />
            </button>
            <button
              onClick={() => handleExportReport("client-activity")}
              className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#1d2438] p-3 text-left transition hover:bg-[#27304a]"
            >
              <div>
                <div className="font-medium text-white">Client Activity</div>
                <div className="text-sm text-[#9aa6cc]">Client usage and satisfaction metrics</div>
              </div>
              <Download className="h-4 w-4 text-[#7da2ff]" />
            </button>
          </div>
        </div>
      </div>

      {/* Contractor Performance Details */}
      {contractorData && contractorData.contractorPerformance.length > 0 && (
        <div className="rounded-[24px] border border-white/8 bg-[#242c45] p-6 shadow-[0_18px_40px_rgba(7,10,20,0.22)]">
          <h3 className="mb-4 flex items-center text-lg font-medium text-white">
            <Users className="mr-2 h-5 w-5 text-[#ff8a6a]" />
            Contractor Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/8">
              <thead className="bg-[#27304a]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9aa6cc]">
                    Contractor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9aa6cc]">
                    Total Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9aa6cc]">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9aa6cc]">
                    Completion Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8 bg-[#1d2438]">
                {contractorData.contractorPerformance.map((perf, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {perf.contractor?.name || "Unknown"}
                      </div>
                      <div className="text-sm text-[#9aa6cc]">
                        {perf.contractor?.company || perf.contractor?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#edf2ff]">
                      {perf.totalOrders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#edf2ff]">
                      {perf.completedOrders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        perf.completionRate >= 80 ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20' :
                        perf.completionRate >= 60 ? 'bg-[#7da2ff]/15 text-[#a9c0ff] ring-1 ring-[#7da2ff]/20' :
                        'bg-[#ff8a6a]/15 text-[#ffb19e] ring-1 ring-[#ff8a6a]/20'
                      }`}>
                        {perf.completionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Trends */}
      <div className="rounded-[24px] border border-white/8 bg-[#242c45] p-6 shadow-[0_18px_40px_rgba(7,10,20,0.22)]">
        <h3 className="mb-4 flex items-center text-lg font-medium text-white">
          <TrendingUp className="mr-2 h-5 w-5 text-[#57d2a6]" />
          Monthly Trends
        </h3>
        
        {/* Simple Bar Chart for Work Orders */}
        <div className="mb-8">
          <h4 className="mb-3 text-sm font-medium text-[#dce5ff]">Work Orders by Month</h4>
          <div className="flex items-end space-x-2 h-32">
            {reportData.monthlyStats.map((stat, index) => {
              const maxOrders = Math.max(...reportData.monthlyStats.map(s => s.workOrders))
              const height = (stat.workOrders / maxOrders) * 100
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full rounded-t bg-[#7da2ff]"
                    style={{ height: `${height}%` }}
                    title={`${stat.workOrders} orders`}
                  ></div>
                  <div className="mt-1 text-xs text-[#9aa6cc]">{stat.month}</div>
                  <div className="text-xs font-medium text-white">{stat.workOrders}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Simple Bar Chart for Revenue */}
        <div className="mb-6">
          <h4 className="mb-3 text-sm font-medium text-[#dce5ff]">Revenue by Month</h4>
          <div className="flex items-end space-x-2 h-32">
            {reportData.monthlyStats.map((stat, index) => {
              const maxRevenue = Math.max(...reportData.monthlyStats.map(s => s.revenue))
              const height = (stat.revenue / maxRevenue) * 100
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full rounded-t bg-[#57d2a6]"
                    style={{ height: `${height}%` }}
                    title={`$${stat.revenue.toLocaleString()}`}
                  ></div>
                  <div className="mt-1 text-xs text-[#9aa6cc]">{stat.month}</div>
                  <div className="text-xs font-medium text-white">${(stat.revenue / 1000).toFixed(0)}k</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/8">
            <thead className="bg-[#27304a]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9aa6cc]">
                  Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9aa6cc]">
                  Work Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9aa6cc]">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9aa6cc]">
                  Avg. Order Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8 bg-[#1d2438]">
              {reportData.monthlyStats.map((stat, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    {stat.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#edf2ff]">
                    {stat.workOrders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#edf2ff]">
                    ${stat.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#edf2ff]">
                    ${stat.workOrders > 0 ? Math.round(stat.revenue / stat.workOrders).toLocaleString() : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Breakdown Chart */}
      {operationalData && operationalData.statusBreakdown.length > 0 && (
        <div className="rounded-[24px] border border-white/8 bg-[#242c45] p-6 shadow-[0_18px_40px_rgba(7,10,20,0.22)]">
          <h3 className="mb-4 flex items-center text-lg font-medium text-white">
            <PieChart className="mr-2 h-5 w-5 text-[#ff8a6a]" />
            Work Order Status Breakdown
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-[#dce5ff]">Status Distribution</h4>
              <div className="space-y-2">
                {operationalData.statusBreakdown.map((status, index) => {
                  const total = operationalData.statusBreakdown.reduce((sum, s) => sum + s._count.id, 0)
                  const percentage = total > 0 ? (status._count.id / total) * 100 : 0
                  const colors = [
                    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 
                    'bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-gray-500'
                  ]
                  
                  return (
                    <div key={index} className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${colors[index % colors.length]}`}></div>
                      <div className="flex-1 flex items-center">
                        <span className="mr-2 text-sm capitalize text-[#9aa6cc]">
                          {status.status.toLowerCase().replace('_', ' ')}
                        </span>
                        <div className="mr-2 h-2 flex-1 rounded-full bg-[#151b2c]">
                          <div 
                            className={`h-2 rounded-full ${colors[index % colors.length]}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="w-12 text-right text-sm font-medium text-white">
                          {status._count.id}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Service Type Distribution */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-[#dce5ff]">Service Type Distribution</h4>
              <div className="space-y-2">
                {operationalData.serviceTypeBreakdown.map((service, index) => {
                  const total = operationalData.serviceTypeBreakdown.reduce((sum, s) => sum + s._count.id, 0)
                  const percentage = total > 0 ? (service._count.id / total) * 100 : 0
                  const colors = [
                    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 
                    'bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-gray-500'
                  ]
                  
                  return (
                    <div key={index} className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${colors[index % colors.length]}`}></div>
                      <div className="flex-1 flex items-center">
                        <span className="mr-2 text-sm capitalize text-[#9aa6cc]">
                          {service.serviceType.toLowerCase().replace('_', ' ')}
                        </span>
                        <div className="mr-2 h-2 flex-1 rounded-full bg-[#151b2c]">
                          <div 
                            className={`h-2 rounded-full ${colors[index % colors.length]}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="w-12 text-right text-sm font-medium text-white">
                          {service._count.id}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
