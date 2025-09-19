import { PrismaClient } from "../src/generated/prisma"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create test users
  const hashedPassword = await bcrypt.hash("password123", 12)

  // Create test client
  const client = await prisma.user.upsert({
    where: { email: "client@test.com" },
    update: {},
    create: {
      email: "client@test.com",
      hashedPassword,
      name: "Test Client",
      role: "CLIENT",
      phone: "(555) 123-4567",
      company: "Test Property Management",
    },
  })

  // Create test contractor
  const contractor = await prisma.user.upsert({
    where: { email: "contractor@test.com" },
    update: {},
    create: {
      email: "contractor@test.com",
      hashedPassword,
      name: "Test Contractor",
      role: "CONTRACTOR",
      phone: "(555) 987-6543",
      company: "Green Lawn Services",
    },
  })

  // Create test coordinator
  const coordinator = await prisma.user.upsert({
    where: { email: "coordinator@test.com" },
    update: {},
    create: {
      email: "coordinator@test.com",
      hashedPassword,
      name: "Test Coordinator",
      role: "COORDINATOR",
      phone: "(555) 444-3333",
      company: "PropertyPreserve Pro",
    },
  })

  // Create test processor
  const processor = await prisma.user.upsert({
    where: { email: "processor@test.com" },
    update: {},
    create: {
      email: "processor@test.com",
      hashedPassword,
      name: "Test Processor",
      role: "PROCESSOR",
      phone: "(555) 333-2222",
      company: "PropertyPreserve Pro",
    },
  })

  // Create test admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      email: "admin@test.com",
      hashedPassword,
      name: "Test Admin",
      role: "ADMIN",
      phone: "(555) 555-5555",
      company: "PropertyPreserve Pro",
    },
  })

  // Create sample work order
  const workOrder = await prisma.workOrder.create({
    data: {
      title: "Grass Cutting - 123 Main St",
      description: "Regular grass cutting and lawn maintenance for the property at 123 Main Street.",
      serviceType: "GRASS_CUT",
      addressLine1: "123 Main Street",
      city: "Springfield",
      state: "MO",
      postalCode: "65801",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      clientId: client.id,
      creatorId: client.id,
      assignedContractorId: contractor.id,
      status: "ASSIGNED",
    },
  })

  // Create sample messages
  await prisma.message.create({
    data: {
      content: "Work order has been assigned. I'll start the grass cutting on Monday morning.",
      workOrderId: workOrder.id,
      authorId: contractor.id,
    },
  })

  await prisma.message.create({
    data: {
      content: "Thank you for accepting the work order. Please let me know when it's completed.",
      workOrderId: workOrder.id,
      authorId: client.id,
    },
  })

  console.log("Database seeded successfully!")
  console.log("\nTest accounts created:")
  console.log("Client: client@test.com / password123")
  console.log("Contractor: contractor@test.com / password123")
  console.log("Coordinator: coordinator@test.com / password123")
  console.log("Processor: processor@test.com / password123")
  console.log("Admin: admin@test.com / password123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
