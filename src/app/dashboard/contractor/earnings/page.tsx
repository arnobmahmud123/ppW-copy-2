"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { 
  DollarSign, 
  TrendingUp,
  Calendar,
  Download,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react"

interface Earning {
  id: string
  workOrderId: string
  amount: number
  status: string
  completedAt: string
  paidAt?: string
  workOrder: {
    title: string
    serviceType: string
  }
}

export default function ContractorEarnings() {
  const { data: session } = useSession()
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [loading, setLoading] = useState(true)
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [pendingEarnings, setPendingEarnings] = useState(0)

  useEffect(() => {
    fetchEarnings()
  }, [])

  const fetchEarnings = async () => {
    try {
      // Mock data - in real app, this would come from API
      const mockEarnings: Earning[] = [
        {
          id: "1",
          workOrderId: "WO-001",
          amount: 150,
          status: "PAID",
          completedAt: "2024-01-15",
          paidAt: "2024-01-20",
          workOrder: {
            title: "Grass Cutting - 123 Main St",
            serviceType: "GRASS_CUT"
          }
        },
        {
          id: "2",
          workOrderId: "WO-002",
          amount: 200,
          status: "PENDING",
          completedAt: "2024-01-18",
          workOrder: {
            title: "Debris Removal - 456 Oak Ave",
            serviceType: "DEBRIS_REMOVAL"
          }
        },
        {
          id: "3",
          workOrderId: "WO-003",
          amount: 125,
          status: "PAID",
          completedAt: "2024-01-12",
          paidAt: "2024-01-17",
          workOrder: {
            title: "Winterization - 789 Pine St",
            serviceType: "WINTERIZATION"
          }
        }
      ]
      
      setEarnings(mockEarnings)
      
      const total = mockEarnings
        .filter(earning => earning.status === "PAID")
        .reduce((sum, earning) => sum + earning.amount, 0)
      
      const pending = mockEarnings
        .filter(earning => earning.status === "PENDING")
        .reduce((sum, earning) => sum + earning.amount, 0)
      
      setTotalEarnings(total)
      setPendingEarnings(pending)
    } catch (error) {
      console.error("Error fetching earnings:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800"
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "OVERDUE":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PAID":
        return CheckCircle
      case "PENDING":
        return Clock
      case "OVERDUE":
        return AlertCircle
      default:
        return Clock
    }
  }

  const handleExportEarnings = () => {
    // Mock export functionality
    console.log("Exporting earnings report...")
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
            Earnings
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Track your completed work and payment status
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={handleExportEarnings}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Earnings
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${totalEarnings.toLocaleString()}
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
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Payment
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${pendingEarnings.toLocaleString()}
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
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Jobs Completed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {earnings.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Payment History
          </h3>
        </div>
        
        <ul className="divide-y divide-gray-200">
          {earnings.map((earning) => {
            const StatusIcon = getStatusIcon(earning.status)
            return (
              <li key={earning.id}>
                <div className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <StatusIcon className="h-8 w-8 text-gray-400 mr-4" />
                      <div>
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {earning.workOrder.title}
                          </p>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(earning.status)}`}>
                            {earning.status}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          Work Order: {earning.workOrderId} • {earning.workOrder.serviceType.replace("_", " ")}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          Completed: {new Date(earning.completedAt).toLocaleDateString()}
                          {earning.paidAt && (
                            <span> • Paid: {new Date(earning.paidAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        ${earning.amount.toLocaleString()}
                      </div>
                      {earning.status === "PENDING" && (
                        <div className="text-sm text-yellow-600">
                          Payment processing
                        </div>
                      )}
                      {earning.status === "PAID" && (
                        <div className="text-sm text-green-600">
                          Payment received
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        
        {earnings.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No earnings yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Complete work orders to start earning payments.
            </p>
          </div>
        )}
      </div>

      {/* Payment Schedule */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Payment Schedule
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Weekly Payments</div>
              <div className="text-sm text-gray-500">Payments are processed every Friday</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">Next Payment</div>
              <div className="text-sm text-gray-500">Friday, Jan 26, 2024</div>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Payment Method</div>
              <div className="text-sm text-gray-500">Direct deposit to your bank account</div>
            </div>
            <button className="text-blue-600 hover:text-blue-500 text-sm font-medium">
              Update Payment Info
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
