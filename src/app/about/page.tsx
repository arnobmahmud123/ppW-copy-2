import Link from "next/link"
import { 
  MapPin, 
  Users, 
  Award, 
  Clock,
  Shield,
  CheckCircle
} from "lucide-react"

export default function About() {
  const stats = [
    { number: "500+", label: "Properties Served" },
    { number: "50+", label: "Qualified Contractors" },
    { number: "3", label: "States Covered" },
    { number: "24/7", label: "Emergency Response" }
  ]

  const values = [
    {
      icon: Shield,
      title: "Reliability",
      description: "Consistent, dependable service you can count on for all your property preservation needs."
    },
    {
      icon: Award,
      title: "Quality",
      description: "High standards and attention to detail in every job we complete."
    },
    {
      icon: Users,
      title: "Partnership",
      description: "Building long-term relationships with clients and contractors based on trust and mutual success."
    },
    {
      icon: Clock,
      title: "Responsiveness",
      description: "Quick response times and efficient communication throughout the entire process."
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
                <Link href="/services" className="px-3 py-2 text-sm font-medium text-[#a8b0d1] hover:text-white">Services</Link>
                <Link href="/about" className="px-3 py-2 text-sm font-medium text-white">About</Link>
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
          <h1 className="text-4xl md:text-5xl font-bold mb-6">About PropertyPreserve Pro</h1>
          <p className="mx-auto max-w-3xl text-xl text-[#c6d1f0]">
            Your trusted partner in property preservation across Missouri, Arkansas, and Alaska.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="marketing-section py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="mb-2 text-4xl font-bold text-[#ff8a57]">{stat.number}</div>
                <div className="text-[#9aa6cc]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">Our Story</h2>
              <p className="mb-6 text-lg text-[#9aa6cc]">
                PropertyPreserve Pro was founded with a simple mission: to provide reliable, 
                professional property preservation services that protect and maintain real estate 
                investments across multiple states.
              </p>
              <p className="mb-6 text-lg text-[#9aa6cc]">
                We understand that property preservation is more than just maintenance—it's about 
                protecting your investment, ensuring compliance, and maintaining property values. 
                Our network of qualified contractors and streamlined processes ensure that every 
                job is completed to the highest standards.
              </p>
              <p className="text-lg text-[#9aa6cc]">
                Today, we're proud to serve clients across Missouri, Arkansas, and Alaska, 
                providing everything from routine maintenance to emergency services with the 
                same commitment to quality and reliability.
              </p>
            </div>
            <div className="marketing-card rounded-[28px] p-8">
              <h3 className="mb-4 text-2xl font-bold text-white">Why Choose Us?</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-[#dce5ff]">Licensed and insured contractors</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">24/7 emergency response</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Real-time job tracking and updates</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Photo documentation for every job</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Competitive pricing and transparent billing</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Dedicated customer support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="marketing-section py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Our Values</h2>
            <p className="text-xl text-[#9aa6cc]">The principles that guide everything we do</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2b3553]">
                  <value.icon className="h-8 w-8 text-[#ff8a57]" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">{value.title}</h3>
                <p className="text-[#9aa6cc]">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Service Areas</h2>
            <p className="text-xl text-[#9aa6cc]">Proudly serving properties across multiple states</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {["Missouri", "Arkansas", "Alaska"].map((state, index) => (
              <div key={index} className="text-center">
                <div className="marketing-card rounded-[28px] p-8">
                  <MapPin className="mx-auto mb-4 h-12 w-12 text-[#ff8a57]" />
                  <h3 className="mb-2 text-2xl font-bold text-white">{state}</h3>
                  <p className="text-[#9aa6cc]">
                    Full property preservation services available statewide with local contractor networks.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Work With Us?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-[#c6d1f0]">
            Join our network of satisfied clients and experience the difference professional property preservation makes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/work-orders/submit"
              className="brand-button px-8 py-4 text-lg font-semibold"
            >
              Submit Work Order
            </Link>
            <Link 
              href="/contact"
              className="brand-button-secondary px-8 py-4 text-lg font-semibold"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
