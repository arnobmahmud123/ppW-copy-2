import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const workOrderSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  serviceType: z.enum(["GRASS_CUT", "DEBRIS_REMOVAL", "WINTERIZATION", "BOARD_UP", "INSPECTION", "MOLD_REMEDIATION", "OTHER"]),
  addressLine1: z.string().min(5, "Address must be at least 5 characters"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().length(2, "State must be 2 characters"),
  postalCode: z.string().min(5, "ZIP code must be at least 5 characters"),
  dueDate: z.string().optional(),
  specialInstructions: z.string().optional(),
  // New fields
  workOrderNumber: z.string().optional(),
  coordinatorId: z.string().optional(),
  processorId: z.string().optional(),
  gpsLat: z.string().optional(),
  gpsLon: z.string().optional(),
  lockCode: z.string().optional(),
  lockLocation: z.string().optional(),
  keyCode: z.string().optional(),
  gateCode: z.string().optional(),
  lotSize: z.string().optional(),
  startDate: z.string().optional(),
  estCompletion: z.string().optional(),
  assignedContractorId: z.string().optional(),
  assignedCoordinatorId: z.string().optional(),
  assignedProcessorId: z.string().optional(),
  attachments: z.array(z.any()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log("Received work order data:", body)
    
    const validatedData = workOrderSchema.parse(body)
    console.log("Validated data:", validatedData)

    // Create work order
    console.log("Creating work order with data:", {
      title: validatedData.title,
      description: validatedData.description,
      serviceType: validatedData.serviceType,
      addressLine1: validatedData.addressLine1,
      addressLine2: validatedData.addressLine2,
      city: validatedData.city,
      state: validatedData.state,
      postalCode: validatedData.postalCode,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
      workOrderNumber: validatedData.workOrderNumber,
      coordinatorId: validatedData.coordinatorId,
      processorId: validatedData.processorId,
      gpsLat: validatedData.gpsLat ? parseFloat(validatedData.gpsLat) : null,
      gpsLon: validatedData.gpsLon ? parseFloat(validatedData.gpsLon) : null,
      lockCode: validatedData.lockCode,
      lockLocation: validatedData.lockLocation,
      keyCode: validatedData.keyCode,
      gateCode: validatedData.gateCode,
      lotSize: validatedData.lotSize,
      startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
      estCompletion: validatedData.estCompletion ? new Date(validatedData.estCompletion) : null,
      clientId: session.user.id,
      creatorId: session.user.id,
        status: "UNASSIGNED",
    })

    const workOrder = await prisma.workOrder.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        serviceType: validatedData.serviceType,
        addressLine1: validatedData.addressLine1,
        addressLine2: validatedData.addressLine2,
        city: validatedData.city,
        state: validatedData.state,
        postalCode: validatedData.postalCode,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        // New fields
        workOrderNumber: validatedData.workOrderNumber,
        coordinator: validatedData.coordinatorId,
        processor: validatedData.processorId,
        gpsLat: validatedData.gpsLat && validatedData.gpsLat.trim() !== "" ? parseFloat(validatedData.gpsLat) : null,
        gpsLon: validatedData.gpsLon && validatedData.gpsLon.trim() !== "" ? parseFloat(validatedData.gpsLon) : null,
        lockCode: validatedData.lockCode,
        lockLocation: validatedData.lockLocation,
        keyCode: validatedData.keyCode,
        gateCode: validatedData.gateCode,
        lotSize: validatedData.lotSize,
        startDate: validatedData.startDate && validatedData.startDate.trim() !== "" ? new Date(validatedData.startDate) : null,
        estCompletion: validatedData.estCompletion && validatedData.estCompletion.trim() !== "" ? new Date(validatedData.estCompletion) : null,
        assignedContractorId: validatedData.assignedContractorId,
        assignedCoordinatorId: validatedData.assignedCoordinatorId,
        assignedProcessorId: validatedData.assignedProcessorId,
        clientId: session.user.id,
        creatorId: session.user.id,
        status: "UNASSIGNED",
      },
    })

    console.log("Work order created successfully:", workOrder.id)

    // TODO: Send notification email to admin
    // TODO: Create initial message/comment
    // TODO: Handle file attachments

    return NextResponse.json(
      { message: "Work order created successfully", workOrder },
      { status: 201 }
    )
  } catch (error) {
    console.error("=== ERROR CAUGHT ===")
    console.error("Error type:", typeof error)
    console.error("Error constructor:", error?.constructor?.name)
    console.error("Error instanceof ZodError:", error instanceof z.ZodError)
    console.error("Full error object:", error)
    
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues)
      console.error("Validation error details:", JSON.stringify(error.issues, null, 2))
      return NextResponse.json(
        { error: "Validation error", details: error.issues, message: "Please check the form fields and try again" },
        { status: 400 }
      )
    }

    console.error("Work order creation error:", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const role = session.user.role

    let workOrders

    if (role === "CLIENT") {
      workOrders = await prisma.workOrder.findMany({
        where: {
          clientId: session.user.id
        },
        include: {
          assignedContractor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          _count: {
            select: {
              messages: true,
              files: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    } else if (role === "CONTRACTOR") {
      workOrders = await prisma.workOrder.findMany({
        where: {
          assignedContractorId: session.user.id
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          _count: {
            select: {
              messages: true,
              files: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    } else if (role === "ADMIN") {
      workOrders = await prisma.workOrder.findMany({
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          assignedContractor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          assignedCoordinator: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          assignedProcessor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          _count: {
            select: {
              messages: true,
              files: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    } else {
      // For other roles (coordinators, processors, etc.), show work orders they are assigned to
      workOrders = await prisma.workOrder.findMany({
        where: {
          OR: [
            { assignedContractorId: session.user.id },
            { assignedCoordinatorId: session.user.id },
            { assignedProcessorId: session.user.id }
          ]
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          assignedContractor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          assignedCoordinator: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          assignedProcessor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          _count: {
            select: {
              messages: true,
              files: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    }

    return NextResponse.json(workOrders)
  } catch (error) {
    console.error("Work orders fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
