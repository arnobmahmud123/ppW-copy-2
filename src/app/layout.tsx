import type { Metadata } from "next"
import "./globals.css"
import { SessionProvider } from "@/components/SessionProvider"
import { AppRuntime } from "@/components/app-runtime"

export const metadata: Metadata = {
  title: "Property Preservation Pro",
  description: "Professional property preservation services across Missouri, Arkansas, and Alaska",
  applicationName: "Property Preservation Pro",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="site-chat-theme antialiased" suppressHydrationWarning>
        <SessionProvider>
          <AppRuntime />
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
