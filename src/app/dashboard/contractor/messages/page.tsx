"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { 
  MessageSquare, 
  Search,
  Send,
  User,
  Clock,
  FileText,
  Filter
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

export default function ContractorMessages() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("ALL")

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
    const matchesSearch = 
      message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.workOrder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.author.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === "ALL" || message.author.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case "CLIENT":
        return "bg-green-100 text-green-800"
      case "ADMIN":
        return "bg-purple-100 text-purple-800"
      case "CONTRACTOR":
        return "bg-blue-100 text-blue-800"
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
            Communicate with clients and coordinators about your assigned work orders
          </p>
        </div>
      </div>

      {/* Search and Filters */}
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
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Roles</option>
              <option value="CLIENT">Clients</option>
              <option value="ADMIN">Coordinators</option>
              <option value="CONTRACTOR">Contractors</option>
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
                        href={`/dashboard/contractor/jobs/${message.workOrder.id}`}
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
              {searchTerm || roleFilter !== "ALL" 
                ? "Try adjusting your search or filter criteria."
                : "Messages will appear here as you communicate about work orders."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
