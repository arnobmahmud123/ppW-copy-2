import Link from "next/link"
import { 
  Scissors, 
  Trash2, 
  Snowflake, 
  Hammer, 
  Search, 
  Shield,
  MapPin,
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
    <div className="marketing-shell">
      {/* Navigation */}
      <nav className="marketing-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-[#2b3159]">PropertyPreserve Pro</h1>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="/" className="px-3 py-2 text-sm font-medium text-[#2b3159]">
                  Home
                </Link>
                <Link href="/services" className="px-3 py-2 text-sm font-medium text-[#7280ad] hover:text-[#2b3159]">
                  Services
                </Link>
                <Link href="/about" className="px-3 py-2 text-sm font-medium text-[#7280ad] hover:text-[#2b3159]">
                  About
                </Link>
                <Link href="/contact" className="px-3 py-2 text-sm font-medium text-[#7280ad] hover:text-[#2b3159]">
                  Contact
                </Link>
                <Link href="/auth/signin" className="brand-button px-4 py-2 text-sm font-medium">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[rgba(224,211,255,0.7)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,174,223,0.32),transparent_22%),radial-gradient(circle_at_top_right,rgba(142,186,255,0.28),transparent_24%),linear-gradient(180deg,#fffdfd_0%,#faf5ff_54%,#eef4ff_100%)]"></div>
        <div className="absolute inset-x-0 top-8 mx-auto h-[24rem] max-w-6xl rounded-[3rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.9)_0%,rgba(249,241,255,0.9)_42%,rgba(238,244,255,0.92)_100%)] shadow-[0_30px_90px_rgba(171,155,221,0.18)]"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="mb-5 inline-flex items-center rounded-full border border-[rgba(220,47,233,0.2)] bg-white/80 px-4 py-1.5 text-sm font-semibold tracking-[0.18em] text-[#8564ff] shadow-[0_10px_30px_rgba(205,165,255,0.18)] uppercase">
              Premium Property Preservation
            </div>
            <h1 className="mb-6 text-4xl font-bold text-[#2b3159] md:text-6xl">
              Professional Property Preservation
            </h1>
            <p className="mb-8 text-xl text-[#5f6d99] md:text-2xl">
              Trusted services across Missouri, Arkansas, and Alaska
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/work-orders/submit"
                className="brand-button px-8 py-4 text-lg font-semibold"
              >
                Submit a Work Order
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link 
                href="/services"
                className="brand-button-secondary px-8 py-4 text-lg font-semibold"
              >
                View Services
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="marketing-section py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {trustSignals.map((signal, index) => (
              <div key={index} className="rounded-[24px] border border-[rgba(224,211,255,0.82)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(245,248,255,0.92)_100%)] px-4 py-5 text-center shadow-[0_16px_36px_rgba(196,186,255,0.12)]">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="mr-2 h-6 w-6 text-[#22c55e]" />
                  <span className="text-sm font-medium text-[#435072]">{signal}</span>
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
            <h2 className="mb-4 text-3xl font-bold text-[#2b3159] md:text-4xl">
              Our Services
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-[#7280ad]">
              Comprehensive property preservation services to maintain and protect your investments
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div key={index} className="marketing-card rounded-[28px] p-6">
                <div className="flex items-center mb-4">
                  <div className="rounded-2xl bg-[linear-gradient(180deg,#fff2fb_0%,#edf4ff_100%)] p-3 shadow-[0_10px_24px_rgba(205,165,255,0.16)]">
                    <service.icon className="h-6 w-6 text-[#dc2fe9]" />
                  </div>
                  <h3 className="ml-4 text-xl font-semibold text-[#2b3159]">
                    {service.title}
                  </h3>
                </div>
                <p className="text-[#7280ad]">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="marketing-section py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-3xl font-bold text-[#2b3159] md:text-4xl">
              Service Areas
            </h2>
            <p className="text-xl text-[#7280ad]">
              Proudly serving properties across multiple states
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {["Missouri", "Arkansas", "Alaska"].map((state, index) => (
              <div key={index} className="text-center">
                <div className="marketing-card rounded-[28px] p-8">
                  <MapPin className="mx-auto mb-4 h-12 w-12 text-[#8564ff]" />
                  <h3 className="mb-2 text-2xl font-bold text-[#2b3159]">{state}</h3>
                  <p className="text-[#7280ad]">
                    Full property preservation services available statewide
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="marketing-card rounded-[36px] px-8 py-14 text-center md:px-14">
          <h2 className="mb-4 text-3xl font-bold text-[#2b3159] md:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-[#5f6d99]">
            Join our network of trusted clients and contractors. Submit your first work order today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/work-orders/submit"
              className="brand-button px-8 py-4 text-lg font-semibold"
            >
              Submit Work Order
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="/auth/signup"
              className="brand-button-secondary px-8 py-4 text-lg font-semibold"
            >
              Create Account
            </Link>
          </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(224,211,255,0.82)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(245,248,255,0.94)_100%)] py-12 text-[#435072]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="mb-4 text-xl font-bold text-[#2b3159]">PropertyPreserve Pro</h3>
              <p className="text-[#7280ad]">
                Professional property preservation services you can trust.
              </p>
            </div>
            <div>
              <h4 className="mb-4 text-lg font-semibold text-[#2b3159]">Services</h4>
              <ul className="space-y-2 text-[#7280ad]">
                <li>Grass Cutting</li>
                <li>Debris Removal</li>
                <li>Winterization</li>
                <li>Board Up</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-lg font-semibold text-[#2b3159]">Company</h4>
              <ul className="space-y-2 text-[#7280ad]">
                <li><Link href="/about" className="hover:text-[#2b3159]">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-[#2b3159]">Contact</Link></li>
                <li><Link href="/services" className="hover:text-[#2b3159]">Services</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-lg font-semibold text-[#2b3159]">Contact</h4>
              <p className="text-[#7280ad]">
                Email: info@propertypreservepro.com<br />
                Phone: (555) 123-4567
              </p>
            </div>
          </div>
          <div className="mt-8 border-t border-[rgba(224,211,255,0.82)] pt-8 text-center text-[#7280ad]">
            <p>&copy; 2024 PropertyPreserve Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
