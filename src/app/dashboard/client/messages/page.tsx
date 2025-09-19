"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { 
  MessageSquare, 
  Search,
  Plus,
  Send,
  User,
  Clock,
  FileText,
  Camera
} from "lucide-react"

interface Message {
  id: string
  content: string
  createdAt: string
  author: {
    name: string
    role: string
  }
  workOrder: {
    id: string
    title: string
  }
}

export default function ClientMessages() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedWorkOrder, setSelectedWorkOrder] = useState("ALL")

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      const response = await fetch("/api/messages")
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.workOrder.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesWorkOrder = selectedWorkOrder === "ALL" || message.workOrder.id === selectedWorkOrder
    return matchesSearch && matchesWorkOrder
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case "CONTRACTOR":
        return "bg-blue-100 text-blue-800"
      case "ADMIN":
        return "bg-purple-100 text-purple-800"
      case "CLIENT":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
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
            Messages
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Communicate with contractors and support team
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <Plus className="h-4 w-4 mr-2" />
            New Message
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={selectedWorkOrder}
              onChange={(e) => setSelectedWorkOrder(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Work Orders</option>
              {/* Work order options would be populated from API */}
            </select>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredMessages.map((message) => (
            <li key={message.id}>
              <div className="px-4 py-4 hover:bg-gray-50">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {message.author.name}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(message.author.role)}`}>
                          {message.author.role}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(message.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-1">
                      <p className="text-sm text-gray-600">
                        {message.content}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center space-x-4">
                      <Link
                        href={`/dashboard/client/work-orders/${message.workOrder.id}`}
                        className="text-sm text-blue-600 hover:text-blue-500 flex items-center"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        {message.workOrder.title}
                      </Link>
                      <button className="text-sm text-green-600 hover:text-green-500 flex items-center">
                        <Send className="h-4 w-4 mr-1" />
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        
        {filteredMessages.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No messages found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedWorkOrder !== "ALL" 
                ? "Try adjusting your search or filter criteria."
                : "You don't have any messages yet."
              }
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Plus className="h-6 w-6 text-blue-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">New Message</span>
          </button>
          <Link
            href="/dashboard/client/work-orders"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-6 w-6 text-green-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">View Work Orders</span>
          </Link>
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Camera className="h-6 w-6 text-purple-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">View Photos</span>
          </button>
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <MessageSquare className="h-6 w-6 text-orange-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Contact Support</span>
          </button>
        </div>
      </div>
    </div>
  )
}
