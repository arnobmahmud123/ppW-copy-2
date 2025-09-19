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
                <Link href="/services" className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Services</Link>
                <Link href="/about" className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">About</Link>
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
          <h1 className="text-4xl md:text-5xl font-bold mb-6">About PropertyPreserve Pro</h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Your trusted partner in property preservation across Missouri, Arkansas, and Alaska.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
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
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our Story</h2>
              <p className="text-lg text-gray-600 mb-6">
                PropertyPreserve Pro was founded with a simple mission: to provide reliable, 
                professional property preservation services that protect and maintain real estate 
                investments across multiple states.
              </p>
              <p className="text-lg text-gray-600 mb-6">
                We understand that property preservation is more than just maintenance—it's about 
                protecting your investment, ensuring compliance, and maintaining property values. 
                Our network of qualified contractors and streamlined processes ensure that every 
                job is completed to the highest standards.
              </p>
              <p className="text-lg text-gray-600">
                Today, we're proud to serve clients across Missouri, Arkansas, and Alaska, 
                providing everything from routine maintenance to emergency services with the 
                same commitment to quality and reliability.
              </p>
            </div>
            <div className="bg-gray-100 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Why Choose Us?</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Licensed and insured contractors</span>
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
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600">The principles that guide everything we do</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="bg-blue-100 p-4 rounded-lg w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <value.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Service Areas</h2>
            <p className="text-xl text-gray-600">Proudly serving properties across multiple states</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {["Missouri", "Arkansas", "Alaska"].map((state, index) => (
              <div key={index} className="text-center">
                <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg">
                  <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{state}</h3>
                  <p className="text-gray-600">
                    Full property preservation services available statewide with local contractor networks.
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
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Work With Us?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join our network of satisfied clients and experience the difference professional property preservation makes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/work-orders/submit"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold inline-flex items-center justify-center transition-colors"
            >
              Submit Work Order
            </Link>
            <Link 
              href="/contact"
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold inline-flex items-center justify-center transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
