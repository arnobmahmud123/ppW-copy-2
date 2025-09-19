"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { 
  MessageSquare, 
  Phone,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Settings,
  HelpCircle
} from "lucide-react"

export default function AdminSupport() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState("tickets")

  const supportTickets = [
    {
      id: "TICKET-001",
      title: "Contractor unable to upload photos",
      status: "OPEN",
      priority: "HIGH",
      client: "ABC Property Management",
      createdAt: "2024-01-15",
      lastUpdate: "2 hours ago"
    },
    {
      id: "TICKET-002", 
      title: "Invoice generation error",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      client: "XYZ Real Estate",
      createdAt: "2024-01-14",
      lastUpdate: "1 day ago"
    },
    {
      id: "TICKET-003",
      title: "Work order assignment issue",
      status: "RESOLVED",
      priority: "LOW",
      client: "Property Solutions Inc",
      createdAt: "2024-01-13",
      lastUpdate: "2 days ago"
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-red-100 text-red-800"
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800"
      case "RESOLVED":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800"
      case "LOW":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Support Center
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage support tickets and system maintenance
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <MessageSquare className="h-4 w-4 mr-2" />
            New Ticket
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Open Tickets
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">8</dd>
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
                    In Progress
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">12</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Resolved
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">156</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Users
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">45</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("tickets")}
              className={`${
                activeTab === "tickets"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Support Tickets
            </button>
            <button
              onClick={() => setActiveTab("system")}
              className={`${
                activeTab === "system"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Settings className="h-4 w-4 mr-2" />
              System Status
            </button>
            <button
              onClick={() => setActiveTab("help")}
              className={`${
                activeTab === "help"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Help Resources
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "tickets" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Support Tickets</h3>
              <div className="space-y-4">
                {supportTickets.map((ticket) => (
                  <div key={ticket.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-sm font-medium text-gray-900">{ticket.title}</h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                            {ticket.status}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          Ticket #{ticket.id} • {ticket.client} • Created {ticket.createdAt}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-500 text-sm font-medium">
                          View
                        </button>
                        <button className="text-green-600 hover:text-green-500 text-sm font-medium">
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "system" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">System Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">Database</h4>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Operational
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">All systems running normally</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">File Storage</h4>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Operational
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Photo uploads working normally</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">Email Service</h4>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Operational
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Notifications being sent</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">Payment Processing</h4>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Operational
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Stripe integration active</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "help" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Help Resources</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Contact Support</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      (555) 123-4567
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      support@propertypreservepro.com
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Mon-Fri 8AM-6PM CST
                    </div>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Documentation</h4>
                  <div className="space-y-2">
                    <a href="#" className="block text-sm text-blue-600 hover:text-blue-500">User Manual</a>
                    <a href="#" className="block text-sm text-blue-600 hover:text-blue-500">API Documentation</a>
                    <a href="#" className="block text-sm text-blue-600 hover:text-blue-500">Video Tutorials</a>
                    <a href="#" className="block text-sm text-blue-600 hover:text-blue-500">FAQ</a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
