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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Reports & Analytics
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive reporting and business intelligence
            {dateRange.startDate && dateRange.endDate && (
              <span className="ml-2 text-blue-600">
                • Filtered: {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
          <button
            onClick={() => fetchReportData("all")}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => handleExportReport("financial")}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Financial
          </button>
          <button
            onClick={() => handleExportReport("operational")}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Operational
          </button>
        </div>
      </div>

      {/* Date Filter */}
      {showDateFilter && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Date Range Filter</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateFilterChange("startDate", e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateFilterChange("endDate", e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={clearDateFilter}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Work Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {reportData.totalWorkOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completion Rate
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {Math.round((reportData.completedWorkOrders / reportData.totalWorkOrders) * 100)}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Revenue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${reportData.totalRevenue.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Contractors
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
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
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Financial Reports
            </h3>
            <button
              onClick={() => fetchReportData("financial")}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Load Details
            </button>
          </div>
          
          {financialData && (
            <div className="mb-4 space-y-2">
              <div className="text-sm text-gray-600">
                Total Revenue: <span className="font-medium">${financialData.invoiceStats._sum.clientTotal?.toLocaleString() || 0}</span>
              </div>
              <div className="text-sm text-gray-600">
                Average Invoice: <span className="font-medium">${Math.round(financialData.invoiceStats._avg.clientTotal || 0).toLocaleString()}</span>
              </div>
              <div className="text-sm text-gray-600">
                Outstanding: <span className="font-medium text-red-600">{financialData.outstandingInvoices.length} invoices</span>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => handleExportReport("financial")}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-gray-900">Revenue Report</div>
                <div className="text-sm text-gray-500">Monthly and yearly revenue analysis</div>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </button>
            <button
              onClick={() => handleExportReport("invoices")}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-gray-900">Invoice Report</div>
                <div className="text-sm text-gray-500">Outstanding and paid invoices</div>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </button>
            <button
              onClick={() => handleExportReport("contractor-payments")}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-gray-900">Contractor Payments</div>
                <div className="text-sm text-gray-500">Payment history and pending amounts</div>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Operational Reports */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Operational Reports
            </h3>
            <button
              onClick={() => fetchReportData("operational")}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Load Details
            </button>
          </div>
          
          {operationalData && (
            <div className="mb-4 space-y-2">
              <div className="text-sm text-gray-600">
                Avg. Completion Time: <span className="font-medium">{operationalData.averageCompletionTime} days</span>
              </div>
              <div className="text-sm text-gray-600">
                Status Breakdown: <span className="font-medium">{operationalData.statusBreakdown.length} statuses</span>
              </div>
              <div className="text-sm text-gray-600">
                Service Types: <span className="font-medium">{operationalData.serviceTypeBreakdown.length} types</span>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => handleExportReport("operational")}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-gray-900">Work Order Report</div>
                <div className="text-sm text-gray-500">All work orders with status and details</div>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </button>
            <button
              onClick={() => {
                fetchReportData("contractor-performance")
                handleExportReport("contractor-performance")
              }}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-gray-900">Contractor Performance</div>
                <div className="text-sm text-gray-500">Job completion rates and quality metrics</div>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </button>
            <button
              onClick={() => handleExportReport("client-activity")}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-gray-900">Client Activity</div>
                <div className="text-sm text-gray-500">Client usage and satisfaction metrics</div>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Contractor Performance Details */}
      {contractorData && contractorData.contractorPerformance.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Contractor Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contractor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completion Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contractorData.contractorPerformance.map((perf, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {perf.contractor?.name || "Unknown"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {perf.contractor?.company || perf.contractor?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {perf.totalOrders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {perf.completedOrders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        perf.completionRate >= 80 ? 'bg-green-100 text-green-800' :
                        perf.completionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
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
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Monthly Trends
        </h3>
        
        {/* Simple Bar Chart for Work Orders */}
        <div className="mb-8">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Work Orders by Month</h4>
          <div className="flex items-end space-x-2 h-32">
            {reportData.monthlyStats.map((stat, index) => {
              const maxOrders = Math.max(...reportData.monthlyStats.map(s => s.workOrders))
              const height = (stat.workOrders / maxOrders) * 100
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t"
                    style={{ height: `${height}%` }}
                    title={`${stat.workOrders} orders`}
                  ></div>
                  <div className="text-xs text-gray-500 mt-1">{stat.month}</div>
                  <div className="text-xs font-medium text-gray-700">{stat.workOrders}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Simple Bar Chart for Revenue */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Revenue by Month</h4>
          <div className="flex items-end space-x-2 h-32">
            {reportData.monthlyStats.map((stat, index) => {
              const maxRevenue = Math.max(...reportData.monthlyStats.map(s => s.revenue))
              const height = (stat.revenue / maxRevenue) * 100
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-green-500 rounded-t"
                    style={{ height: `${height}%` }}
                    title={`$${stat.revenue.toLocaleString()}`}
                  ></div>
                  <div className="text-xs text-gray-500 mt-1">{stat.month}</div>
                  <div className="text-xs font-medium text-gray-700">${(stat.revenue / 1000).toFixed(0)}k</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Order Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.monthlyStats.map((stat, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {stat.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stat.workOrders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${stat.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <PieChart className="h-5 w-5 mr-2" />
            Work Order Status Breakdown
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Status Distribution</h4>
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
                        <span className="text-sm text-gray-600 capitalize mr-2">
                          {status.status.toLowerCase().replace('_', ' ')}
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${colors[index % colors.length]}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">
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
              <h4 className="text-sm font-medium text-gray-700 mb-3">Service Type Distribution</h4>
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
                        <span className="text-sm text-gray-600 capitalize mr-2">
                          {service.serviceType.toLowerCase().replace('_', ' ')}
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${colors[index % colors.length]}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">
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
