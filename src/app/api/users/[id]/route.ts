import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import bcrypt from "bcryptjs"

const userUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  role: z.enum(["CLIENT", "CONTRACTOR", "COORDINATOR", "PROCESSOR", "ADMIN"]).optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
})

const userCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["CLIENT", "CONTRACTOR", "COORDINATOR", "PROCESSOR", "ADMIN"]),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

// GET - Fetch a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        company: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update a user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const validatedData = userUpdateSchema.parse(body)

    // Check if email is already taken by another user (only if email is being updated)
    if (validatedData.email !== undefined) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: validatedData.email,
          NOT: { id }
        }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    
    // Only update fields that are provided
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name
    }
    if (validatedData.email !== undefined) {
      updateData.email = validatedData.email
    }
    if (validatedData.role !== undefined) {
      updateData.role = validatedData.role
    }
    if (validatedData.phone !== undefined) {
      updateData.phone = validatedData.phone || null
    }
    if (validatedData.company !== undefined) {
      updateData.company = validatedData.company || null
    }
    if (validatedData.address !== undefined) {
      updateData.address = validatedData.address || null
    }

    // Only hash password if provided
    if (validatedData.password) {
      updateData.hashedPassword = await bcrypt.hash(validatedData.password, 12)
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        company: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Error updating user:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Prevent deleting the current admin user
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      if (user.role === "CONTRACTOR") {
        await tx.workOrder.updateMany({
          where: { assignedContractorId: id },
          data: {
            assignedContractorId: null,
            contractorName: user.name,
            contractorEmail: user.email,
            contractorPhone: user.phone ?? null,
          },
        })
      }

      if (user.role === "COORDINATOR") {
        await tx.workOrder.updateMany({
          where: { assignedCoordinatorId: id },
          data: {
            assignedCoordinatorId: null,
            coordinator: user.name,
          },
        })
      }

      if (user.role === "PROCESSOR") {
        await tx.workOrder.updateMany({
          where: { assignedProcessorId: id },
          data: {
            assignedProcessorId: null,
            processor: user.name,
          },
        })
      }

      await tx.notification.deleteMany({
        where: {
          OR: [{ userId: id }, { message: { authorId: id } }],
        },
      })

      await tx.messageRead.deleteMany({
        where: { userId: id },
      })

      await tx.messageRead.deleteMany({
        where: { message: { authorId: id } },
      })

      await tx.message.deleteMany({
        where: { authorId: id },
      })

      await tx.user.delete({
        where: { id },
      })
    })

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
