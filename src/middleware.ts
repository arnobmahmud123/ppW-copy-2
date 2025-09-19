import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith("/auth")

    // Allow access to auth pages for unauthenticated users
    if (isAuthPage) {
      if (isAuth) {
        // Redirect authenticated users to appropriate dashboard
        const role = token?.role
        if (role === "CLIENT") {
          return NextResponse.redirect(new URL("/dashboard/client", req.url))
        } else if (role === "CONTRACTOR") {
          return NextResponse.redirect(new URL("/dashboard/contractor", req.url))
        } else if (role === "ADMIN") {
          return NextResponse.redirect(new URL("/dashboard/admin", req.url))
        } else if (role === "COORDINATOR") {
          return NextResponse.redirect(new URL("/dashboard/coordinator", req.url))
        } else if (role === "PROCESSOR") {
          return NextResponse.redirect(new URL("/dashboard/processor", req.url))
        }
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
      return null
    }

    // Protect dashboard routes
    if (req.nextUrl.pathname.startsWith("/dashboard")) {
      if (!isAuth) {
        return NextResponse.redirect(new URL("/auth/signin", req.url))
      }

      // Role-based access control
      const role = token?.role
      const pathname = req.nextUrl.pathname

      if (pathname.startsWith("/dashboard/client") && role !== "CLIENT") {
        return NextResponse.redirect(new URL(`/dashboard/${role?.toLowerCase()}`, req.url))
      }

      if (pathname.startsWith("/dashboard/contractor") && role !== "CONTRACTOR") {
        return NextResponse.redirect(new URL(`/dashboard/${role?.toLowerCase()}`, req.url))
      }

      if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
        return NextResponse.redirect(new URL(`/dashboard/${role?.toLowerCase()}`, req.url))
      }

      if (pathname.startsWith("/dashboard/coordinator") && role !== "COORDINATOR") {
        return NextResponse.redirect(new URL(`/dashboard/${role?.toLowerCase()}`, req.url))
      }

      if (pathname.startsWith("/dashboard/processor") && role !== "PROCESSOR") {
        return NextResponse.redirect(new URL(`/dashboard/${role?.toLowerCase()}`, req.url))
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages and public pages
        if (req.nextUrl.pathname.startsWith("/auth") || 
            req.nextUrl.pathname === "/" ||
            req.nextUrl.pathname.startsWith("/services") ||
            req.nextUrl.pathname.startsWith("/about") ||
            req.nextUrl.pathname.startsWith("/contact")) {
          return true
        }
        // Require authentication for protected routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/work-orders/:path*"
  ]
}
