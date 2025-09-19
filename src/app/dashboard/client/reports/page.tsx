"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { 
  FileText, 
  Download,
  TrendingUp,
  Calendar,
  BarChart3,
  PieChart
} from "lucide-react"

interface MonthlyStat {
  month: string
  workOrders: number
  spent: number
}

interface ReportData {
  totalWorkOrders: number
  completedWorkOrders: number
  totalSpent: number
  monthlyStats: MonthlyStat[]
}

export default function ClientReports() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<ReportData>({
    totalWorkOrders: 0,
    completedWorkOrders: 0,
    totalSpent: 0,
    monthlyStats: []
  })

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    try {
      // Mock data - in real app, this would come from API
      setReportData({
        totalWorkOrders: 24,
        completedWorkOrders: 22,
        totalSpent: 8750,
        monthlyStats: [
          { month: "Jan", workOrders: 3, spent: 1200 },
          { month: "Feb", workOrders: 5, spent: 2100 },
          { month: "Mar", workOrders: 4, spent: 1800 },
          { month: "Apr", workOrders: 6, spent: 2400 },
          { month: "May", workOrders: 3, spent: 1250 },
          { month: "Jun", workOrders: 3, spent: 0 }
        ]
      })
    } catch (error) {
      console.error("Error fetching report data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = (type: string) => {
    // Mock export functionality
    console.log(`Exporting ${type} report...`)
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
            Reports
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            View your property preservation activity and spending reports
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button
            onClick={() => handleExportReport("activity")}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Activity
          </button>
          <button
            onClick={() => handleExportReport("spending")}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Spending
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <BarChart3 className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Spent
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${reportData.totalSpent.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Activity */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Monthly Activity
        </h3>
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
                  Amount Spent
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
                    ${stat.spent.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${stat.workOrders > 0 ? Math.round(stat.spent / stat.workOrders).toLocaleString() : "0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Reports */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Activity Reports
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => handleExportReport("work-orders")}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-gray-900">Work Order History</div>
                <div className="text-sm text-gray-500">Complete history of all work orders</div>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </button>
            <button
              onClick={() => handleExportReport("completion")}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-gray-900">Completion Reports</div>
                <div className="text-sm text-gray-500">Before/after photos and completion details</div>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Financial Reports */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Financial Reports
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => handleExportReport("invoices")}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-gray-900">Invoice Summary</div>
                <div className="text-sm text-gray-500">All invoices and payment history</div>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </button>
            <button
              onClick={() => handleExportReport("spending-analysis")}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-gray-900">Spending Analysis</div>
                <div className="text-sm text-gray-500">Cost breakdown by service type</div>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
