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
    <div className="marketing-shell">
      {/* Navigation */}
      <nav className="marketing-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-white">PropertyPreserve Pro</Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="/" className="px-3 py-2 text-sm font-medium text-[#a8b0d1] hover:text-white">Home</Link>
                <Link href="/services" className="px-3 py-2 text-sm font-medium text-white">Services</Link>
                <Link href="/about" className="px-3 py-2 text-sm font-medium text-[#a8b0d1] hover:text-white">About</Link>
                <Link href="/contact" className="px-3 py-2 text-sm font-medium text-[#a8b0d1] hover:text-white">Contact</Link>
                <Link href="/auth/signin" className="brand-button px-4 py-2 text-sm font-medium">Sign In</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Services</h1>
          <p className="mx-auto max-w-3xl text-xl text-[#c6d1f0]">
            Comprehensive property preservation services to maintain and protect your investments across Missouri, Arkansas, and Alaska.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {services.map((service, index) => (
              <div key={index} className="marketing-card rounded-[28px] p-8">
                <div className="flex items-start mb-6">
                  <div className="mr-4 rounded-2xl bg-[#2b3553] p-4">
                    <service.icon className="h-8 w-8 text-[#ff8a57]" />
                  </div>
                  <div>
                    <h3 className="mb-2 text-2xl font-bold text-white">{service.title}</h3>
                    <p className="mb-4 text-[#9aa6cc]">{service.description}</p>
                    <div className="flex items-center font-semibold text-[#ffb487]">
                      <DollarSign className="h-5 w-5 mr-1" />
                      {service.pricing}
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h4 className="mb-3 text-lg font-semibold text-white">What's Included:</h4>
                  <ul className="space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-[#9aa6cc]">
                        <CheckCircle className="mr-2 h-5 w-5 shrink-0 text-[#7ee0a6]" />
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
      <section className="marketing-section py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">How It Works</h2>
            <p className="text-xl text-[#9aa6cc]">Simple, streamlined process from request to completion</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ff6b3c] text-2xl font-bold text-white">1</div>
              <h3 className="mb-2 text-xl font-semibold text-white">Submit Request</h3>
              <p className="text-[#9aa6cc]">Submit your work order with property details and service requirements</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ff6b3c] text-2xl font-bold text-white">2</div>
              <h3 className="mb-2 text-xl font-semibold text-white">We Assign</h3>
              <p className="text-[#9aa6cc]">Our team assigns a qualified contractor and schedules the work</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ff6b3c] text-2xl font-bold text-white">3</div>
              <h3 className="mb-2 text-xl font-semibold text-white">Work Complete</h3>
              <p className="text-[#9aa6cc]">Receive photos, reports, and documentation of completed work</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-[#c6d1f0]">
            Submit your first work order today and experience our professional property preservation services.
          </p>
          <Link 
            href="/work-orders/submit"
            className="brand-button px-8 py-4 text-lg font-semibold"
          >
            Submit Work Order
          </Link>
        </div>
      </section>
    </div>
  )
}
