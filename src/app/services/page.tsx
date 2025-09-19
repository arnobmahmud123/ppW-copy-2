import Link from "next/link"
import { 
  Scissors, 
  Trash2, 
  Snowflake, 
  Hammer, 
  Search, 
  Shield,
  Clock,
  DollarSign,
  CheckCircle
} from "lucide-react"

export default function Services() {
  const services = [
    {
      icon: Scissors,
      title: "Grass Cutting & Lawn Maintenance",
      description: "Professional lawn care services including grass cutting, edging, and basic landscaping maintenance.",
      features: ["Regular maintenance schedules", "Emergency grass cutting", "Property inspection included", "Before/after photos"],
      pricing: "Starting at $75 per service"
    },
    {
      icon: Trash2,
      title: "Debris Removal",
      description: "Complete removal of debris, trash, and unwanted materials from properties.",
      features: ["Full property cleanup", "Hazardous material handling", "Dumpster rental coordination", "Disposal documentation"],
      pricing: "Starting at $150 per load"
    },
    {
      icon: Snowflake,
      title: "Winterization",
      description: "Comprehensive winterization services to protect properties from cold weather damage.",
      features: ["Pipe insulation", "Water shut-off", "HVAC protection", "Weather sealing"],
      pricing: "Starting at $200 per property"
    },
    {
      icon: Hammer,
      title: "Board Up Services",
      description: "Secure boarding of windows, doors, and other openings to protect vacant properties.",
      features: ["Emergency board-up", "Custom fitting", "Security hardware", "Weather protection"],
      pricing: "Starting at $50 per opening"
    },
    {
      icon: Search,
      title: "Property Inspections",
      description: "Thorough property inspections with detailed condition reports and photo documentation.",
      features: ["Interior/exterior inspection", "Condition assessment", "Photo documentation", "Detailed reports"],
      pricing: "Starting at $100 per inspection"
    },
    {
      icon: Shield,
      title: "Mold Remediation",
      description: "Professional mold detection, testing, and remediation services.",
      features: ["Mold testing", "Safe removal", "Prevention measures", "Certification"],
      pricing: "Starting at $300 per area"
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">PropertyPreserve Pro</Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="/" className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Home</Link>
                <Link href="/services" className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Services</Link>
                <Link href="/about" className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">About</Link>
                <Link href="/contact" className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Contact</Link>
                <Link href="/auth/signin" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium">Sign In</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Services</h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Comprehensive property preservation services to maintain and protect your investments across Missouri, Arkansas, and Alaska.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {services.map((service, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-start mb-6">
                  <div className="bg-blue-100 p-4 rounded-lg mr-4">
                    <service.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{service.title}</h3>
                    <p className="text-gray-600 mb-4">{service.description}</p>
                    <div className="flex items-center text-green-600 font-semibold">
                      <DollarSign className="h-5 w-5 mr-1" />
                      {service.pricing}
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">What's Included:</h4>
                  <ul className="space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-gray-600">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Simple, streamlined process from request to completion</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Submit Request</h3>
              <p className="text-gray-600">Submit your work order with property details and service requirements</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">We Assign</h3>
              <p className="text-gray-600">Our team assigns a qualified contractor and schedules the work</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Work Complete</h3>
              <p className="text-gray-600">Receive photos, reports, and documentation of completed work</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Submit your first work order today and experience our professional property preservation services.
          </p>
          <Link 
            href="/work-orders/submit"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold inline-flex items-center justify-center transition-colors"
          >
            Submit Work Order
          </Link>
        </div>
      </section>
    </div>
  )
}
