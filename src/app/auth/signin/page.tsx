"use client"

import { Suspense } from "react"
import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

function SignInForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from") || "/dashboard"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
      } else {
        const session = await getSession()
        if (session?.user.role === "CLIENT") {
          router.push("/dashboard/client")
        } else if (session?.user.role === "CONTRACTOR") {
          router.push("/dashboard/contractor")
        } else if (session?.user.role === "ADMIN") {
          router.push("/dashboard/admin")
        } else if (session?.user.role === "COORDINATOR") {
          router.push("/dashboard/coordinator")
        } else if (session?.user.role === "PROCESSOR") {
          router.push("/dashboard/processor")
        } else {
          router.push(from)
        }
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="marketing-shell flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="marketing-card max-w-md w-full space-y-8 rounded-[32px] p-8">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-[#9aa6cc]">
            Or{" "}
            <Link
              href="/auth/signup"
              className="font-medium text-[#ff8a57] hover:text-[#ffb487]"
            >
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-2xl border border-[#5a2f35] bg-[#3b2228] px-4 py-3 text-[#ffb1bc]">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#dce5ff]">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="brand-input mt-1 appearance-none relative block px-3 py-2 sm:text-sm"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#dce5ff]">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="brand-input mt-1 appearance-none relative block px-3 py-2 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="brand-button group relative flex w-full justify-center px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SignIn() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  )
}
