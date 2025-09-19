import Link from "next/link"
import { 
  Scissors, 
  Trash2, 
  Snowflake, 
  Hammer, 
  Search, 
  Shield,
  MapPin,
  Star,
  ArrowRight,
  CheckCircle
} from "lucide-react"

export default function Home() {
  const services = [
    {
      icon: Scissors,
      title: "Grass Cut",
      description: "Professional lawn maintenance and grass cutting services"
    },
    {
      icon: Trash2,
      title: "Debris Removal",
      description: "Complete debris and waste removal from properties"
    },
    {
      icon: Snowflake,
      title: "Winterization",
      description: "Comprehensive winterization to protect properties"
    },
    {
      icon: Hammer,
      title: "Board Up",
      description: "Secure boarding services for vacant properties"
    },
    {
      icon: Search,
      title: "Inspections",
      description: "Thorough property inspections and condition reports"
    },
    {
      icon: Shield,
      title: "Mold Remediation",
      description: "Professional mold detection and remediation services"
    }
  ]

  const trustSignals = [
    "Serving Missouri, Arkansas, and Alaska",
    "Trusted by National Clients",
    "24/7 Emergency Response",
    "Licensed & Insured"
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-blue-600">PropertyPreserve Pro</h1>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="/" className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Home
                </Link>
                <Link href="/services" className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Services
                </Link>
                <Link href="/about" className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  About
                </Link>
                <Link href="/contact" className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Contact
                </Link>
                <Link href="/auth/signin" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Professional Property Preservation
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Trusted services across Missouri, Arkansas, and Alaska
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/work-orders/submit"
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold inline-flex items-center justify-center transition-colors"
              >
                Submit a Work Order
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link 
                href="/services"
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold inline-flex items-center justify-center transition-colors"
              >
                View Services
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {trustSignals.map((signal, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">{signal}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Services
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive property preservation services to maintain and protect your investments
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <service.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 ml-4">
                    {service.title}
                  </h3>
                </div>
                <p className="text-gray-600">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Service Areas
            </h2>
            <p className="text-xl text-gray-600">
              Proudly serving properties across multiple states
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {["Missouri", "Arkansas", "Alaska"].map((state, index) => (
              <div key={index} className="text-center">
                <div className="bg-white p-8 rounded-xl shadow-lg">
                  <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{state}</h3>
                  <p className="text-gray-600">
                    Full property preservation services available statewide
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join our network of trusted clients and contractors. Submit your first work order today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/work-orders/submit"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold inline-flex items-center justify-center transition-colors"
            >
              Submit Work Order
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="/auth/signup"
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold inline-flex items-center justify-center transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">PropertyPreserve Pro</h3>
              <p className="text-gray-400">
                Professional property preservation services you can trust.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Grass Cutting</li>
                <li>Debris Removal</li>
                <li>Winterization</li>
                <li>Board Up</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/services" className="hover:text-white">Services</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <p className="text-gray-400">
                Email: info@propertypreservepro.com<br />
                Phone: (555) 123-4567
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 PropertyPreserve Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}