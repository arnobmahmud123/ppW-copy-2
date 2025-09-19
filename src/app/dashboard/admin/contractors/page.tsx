"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { 
  Users, 
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Star,
  CheckCircle,
  XCircle
} from "lucide-react"

interface Contractor {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  role: string
  createdAt: string
  _count: {
    workOrdersAsClient: number
    workOrdersAssigned: number
  }
}

export default function AdminContractors() {
  const { data: session } = useSession()
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchContractors()
  }, [])

  const fetchContractors = async () => {
    try {
      const response = await fetch("/api/admin/contractors")
      if (response.ok) {
        const data = await response.json()
        setContractors(data.contractors)
      }
    } catch (error) {
      console.error("Error fetching contractors:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredContractors = contractors.filter(contractor =>
    contractor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contractor.company?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  )

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
            Contractors
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your network of property preservation contractors
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            href="/auth/signup"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Contractor
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search contractors by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Contractors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContractors.map((contractor) => (
          <div key={contractor.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">{contractor.name}</h3>
                  {contractor.company && (
                    <p className="text-sm text-gray-600">{contractor.company}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-blue-600 hover:text-blue-500">
                  <Eye className="h-4 w-4" />
                </button>
                <button className="text-green-600 hover:text-green-500">
                  <Edit className="h-4 w-4" />
                </button>
                <button className="text-red-600 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-2" />
                {contractor.email}
              </div>
              {contractor.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {contractor.phone}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Jobs Completed</div>
                  <div className="font-semibold text-gray-900">{contractor._count.workOrdersAssigned}</div>
                </div>
                <div>
                  <div className="text-gray-500">Rating</div>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="ml-1 font-semibold text-gray-900">4.8</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              <button className="flex-1 bg-green-100 text-green-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-green-200">
                <CheckCircle className="h-4 w-4 inline mr-1" />
                Active
              </button>
              <button className="flex-1 bg-blue-100 text-blue-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-200">
                View Jobs
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredContractors.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No contractors found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm 
              ? "Try adjusting your search criteria."
              : "Get started by adding your first contractor."
            }
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <Link
                href="/auth/signup"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Contractor
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
