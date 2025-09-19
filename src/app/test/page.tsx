import Link from "next/link"
import { CheckCircle, Users, FileText, Camera, MessageSquare } from "lucide-react"

export default function TestPage() {
  const features = [
    {
      icon: Users,
      title: "Role-Based Access",
      description: "Separate dashboards for Clients, Contractors, and Admins",
      status: "✅ Complete"
    },
    {
      icon: FileText,
      title: "Work Order Management",
      description: "Create, track, and manage property preservation work orders",
      status: "✅ Complete"
    },
    {
      icon: Camera,
      title: "Photo Upload System",
      description: "Upload before, during, and after photos with categorization",
      status: "✅ Complete"
    },
    {
      icon: MessageSquare,
      title: "Messaging System",
      description: "Communicate between clients, contractors, and admin",
      status: "✅ Complete"
    }
  ]

  const testAccounts = [
    { role: "Client", email: "client@test.com", password: "password123", description: "Submit work orders, track progress, view invoices" },
    { role: "Contractor", email: "contractor@test.com", password: "password123", description: "Manage assigned jobs, upload photos, update status" },
    { role: "Admin", email: "admin@test.com", password: "password123", description: "Oversee all operations, manage contractors, billing" }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Property Preservation Pro - Test Dashboard
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your comprehensive property preservation management system is ready! 
            Test all features with the accounts below.
          </p>
        </div>

        {/* Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-green-800">System Status: Ready</h3>
              <p className="text-green-700">All core features are implemented and functional</p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600 mt-1">{feature.description}</p>
                  <p className="text-sm text-green-600 font-medium mt-2">{feature.status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Test Accounts */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Test Accounts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testAccounts.map((account, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{account.role}</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Email:</strong> {account.email}</p>
                  <p><strong>Password:</strong> {account.password}</p>
                  <p className="text-gray-600 mt-2">{account.description}</p>
                </div>
                <Link
                  href="/auth/signin"
                  className="mt-4 inline-block w-full text-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign In as {account.role}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mr-3">🏠</span>
              <div>
                <div className="font-medium">Homepage</div>
                <div className="text-sm text-gray-500">Public website</div>
              </div>
            </Link>
            <Link
              href="/services"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mr-3">🔧</span>
              <div>
                <div className="font-medium">Services</div>
                <div className="text-sm text-gray-500">Service offerings</div>
              </div>
            </Link>
            <Link
              href="/work-orders/submit"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mr-3">📝</span>
              <div>
                <div className="font-medium">Submit Work Order</div>
                <div className="text-sm text-gray-500">Create new request</div>
              </div>
            </Link>
            <Link
              href="/contact"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mr-3">📞</span>
              <div>
                <div className="font-medium">Contact</div>
                <div className="text-sm text-gray-500">Get in touch</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">How to Test the System</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-700">
            <li>Click "Sign In" on any of the test accounts above</li>
            <li>Explore the role-specific dashboard</li>
            <li>Try creating a work order (as client)</li>
            <li>Upload photos and update status (as contractor)</li>
            <li>Manage all operations (as admin)</li>
            <li>Test the messaging system between roles</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
