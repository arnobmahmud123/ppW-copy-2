import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  serviceType: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = contactSchema.parse(body)

    // Here you would typically:
    // 1. Save to database
    // 2. Send email notification
    // 3. Add to CRM system
    
    // For now, we'll just log the data and return success
    console.log("Contact form submission:", validatedData)

    // TODO: Implement email sending with nodemailer
    // TODO: Save to database for lead tracking
    // TODO: Integrate with CRM system

    return NextResponse.json(
      { message: "Message sent successfully" },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Contact form error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
