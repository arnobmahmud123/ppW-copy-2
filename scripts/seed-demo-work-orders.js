const { PrismaClient } = require("../src/generated/prisma")

const prisma = new PrismaClient()
const EXISTING_HASH = "$2b$12$lCvG.l/E0AntEj10BRrxeOUG9m1OphUGYyFpf4r7KlAIiutRqgkoK"

const firstNames = [
  "Liam", "Noah", "Elijah", "James", "William", "Benjamin", "Lucas", "Henry", "Alexander", "Mason",
  "Michael", "Ethan", "Daniel", "Jacob", "Logan", "Jackson", "Levi", "Sebastian", "Mateo", "Jack",
  "Owen", "Theodore", "Aiden", "Samuel", "Joseph", "John", "David", "Wyatt", "Matthew", "Luke",
  "Asher", "Carter", "Julian", "Grayson", "Leo", "Jayden", "Gabriel", "Isaac", "Lincoln", "Anthony",
  "Hudson", "Dylan", "Ezra", "Thomas", "Charles", "Christopher", "Jaxon", "Maverick", "Josiah", "Isaiah",
]

const lastNames = [
  "Turner", "Brooks", "Hayes", "Foster", "Reed", "Parker", "Bryant", "Coleman", "Jenkins", "Powell",
  "Long", "Perry", "Patterson", "Hughes", "Flores", "Washington", "Butler", "Simmons", "Bryan", "Griffin",
  "Diaz", "Hayden", "Russell", "Barnes", "Fisher", "Henderson", "Cruz", "Woods", "Gibson", "West",
  "Jordan", "Owens", "Reynolds", "Hamilton", "Ford", "Marshall", "Murray", "Freeman", "Warren", "Hunter",
  "Dixon", "Ellis", "Porter", "Ray", "Stevens", "Hanson", "Fleming", "Moss", "Carver", "Harper",
]

const companyPrefixes = [
  "Summit", "Blue Ridge", "Riverstone", "Atlas", "Prime", "Cedar", "Keystone", "Red Oak", "Cornerstone", "True North",
  "Pioneer", "Liberty", "Evergreen", "Stonebridge", "Sterling", "Oakline", "Heritage", "Ironwood", "Skyline", "Heartland",
]

const companySuffixes = [
  "Property Services", "Field Solutions", "Preservation Group", "Restoration Co.", "Contracting", "Maintenance Pros",
  "Asset Services", "Home Services", "Workforce", "Property Care",
]

const streetNames = [
  "Maple", "Oak", "Pine", "Cedar", "Walnut", "Birch", "Willow", "Lakeview", "Park", "Sunset",
  "Ridge", "Hillcrest", "Meadow", "Creek", "Highland", "Liberty", "Washington", "Jefferson", "Madison", "Franklin",
]

const streetTypes = ["St", "Ave", "Dr", "Ln", "Ct", "Way", "Blvd", "Rd"]

const cities = [
  { city: "Springfield", state: "MO", zipBase: 65801 },
  { city: "Columbia", state: "MO", zipBase: 65201 },
  { city: "St. Louis", state: "MO", zipBase: 63101 },
  { city: "Kansas City", state: "MO", zipBase: 64101 },
  { city: "Joplin", state: "MO", zipBase: 64801 },
  { city: "Tulsa", state: "OK", zipBase: 74101 },
  { city: "Wichita", state: "KS", zipBase: 67201 },
  { city: "Little Rock", state: "AR", zipBase: 72201 },
]

const workOrderTemplates = [
  { title: "Winterization Request", serviceType: "WINTERIZATION" },
  { title: "Initial Secure", serviceType: "BOARD_UP" },
  { title: "Bid Request - Exterior Debris", serviceType: "DEBRIS_REMOVAL" },
  { title: "Bid Approval - Lawn Recovery", serviceType: "GRASS_CUT" },
  { title: "Re-Secure After Vacancy", serviceType: "BOARD_UP" },
  { title: "Eviction Trash-Out", serviceType: "DEBRIS_REMOVAL" },
  { title: "Appliance Inspection", serviceType: "INSPECTION" },
  { title: "Mold Mitigation Review", serviceType: "MOLD_REMEDIATION" },
  { title: "Quality Control Inspection", serviceType: "INSPECTION" },
  { title: "Recurring Grass Cut", serviceType: "GRASS_CUT" },
  { title: "Property Condition Inspection", serviceType: "INSPECTION" },
  { title: "Fence and Board Up", serviceType: "BOARD_UP" },
]

const statuses = [
  "NEW",
  "UNASSIGNED",
  "IN_PROGRESS",
  "ASSIGNED",
  "READ",
  "FIELD_COMPLETE",
  "OFFICE_APPROVED",
  "SENT_TO_CLIENT",
  "CLOSED",
]

const taskTemplates = {
  GRASS_CUT: [{ taskType: "Completion", taskName: "Grass Cut MCS", qty: 1, contractorPrice: 35, clientPrice: 60, comments: "Cut, edge, and blow all turf areas." }],
  DEBRIS_REMOVAL: [{ taskType: "Completion", taskName: "Debris Removal", qty: 1, contractorPrice: 95, clientPrice: 145, comments: "Remove exterior debris and haul away." }],
  WINTERIZATION: [{ taskType: "Completion", taskName: "Winterization", qty: 1, contractorPrice: 140, clientPrice: 220, comments: "Standard plumbing winterization and pressure test." }],
  BOARD_UP: [{ taskType: "Completion", taskName: "Board Up", qty: 1, contractorPrice: 125, clientPrice: 190, comments: "Secure accessible openings with board-up." }],
  INSPECTION: [{ taskType: "Inspection", taskName: "Inspection", qty: 1, contractorPrice: 40, clientPrice: 75, comments: "Complete full property condition inspection." }],
  MOLD_REMEDIATION: [{ taskType: "Bid", taskName: "Mold Remediation (Bid)", qty: 1, contractorPrice: 250, clientPrice: 420, comments: "Provide mold treatment estimate and remediation scope." }],
  OTHER: [{ taskType: "Completion", taskName: "General Service", qty: 1, contractorPrice: 50, clientPrice: 80, comments: "General preservation work." }],
}

function randomPhone(index) {
  const tail = String(1000 + index).slice(-4)
  return `(417) 555-${tail}`
}

function makeCompany(index) {
  return `${companyPrefixes[index % companyPrefixes.length]} ${companySuffixes[index % companySuffixes.length]}`
}

function makeAddress(index) {
  const place = cities[index % cities.length]
  const number = 100 + index * 7
  const street = streetNames[index % streetNames.length]
  const type = streetTypes[index % streetTypes.length]
  const postalCode = String(place.zipBase + (index % 50)).padStart(5, "0")
  return {
    addressLine1: `${number} ${street} ${type}`,
    city: place.city,
    state: place.state,
    postalCode,
  }
}

function buildTasks(serviceType, index) {
  const base = taskTemplates[serviceType] || taskTemplates.OTHER
  return JSON.stringify(
    base.map((task, taskIndex) => ({
      id: `task_${index + 1}_${taskIndex + 1}`,
      ...task,
      photoRequirements: [],
    }))
  )
}

async function main() {
  const [client, creator, coordinator, processor] = await Promise.all([
    prisma.user.findFirst({ where: { role: "CLIENT" }, orderBy: { createdAt: "asc" } }),
    prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } }),
    prisma.user.findFirst({ where: { role: "COORDINATOR" }, orderBy: { createdAt: "asc" } }),
    prisma.user.findFirst({ where: { role: "PROCESSOR" }, orderBy: { createdAt: "asc" } }),
  ])

  if (!client || !creator || !coordinator || !processor) {
    throw new Error("Missing seeded base users required to create demo data.")
  }

  const contractors = []

  for (let i = 0; i < 50; i += 1) {
    const id = `demo_contractor_${String(i + 1).padStart(3, "0")}`
    const name = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`
    const email = `contractor${String(i + 1).padStart(3, "0")}@demo.local`
    const phone = randomPhone(i + 1)
    const company = makeCompany(i)

    const contractor = await prisma.user.upsert({
      where: { email },
      update: {
        hashedPassword: EXISTING_HASH,
        name,
        role: "CONTRACTOR",
        phone,
        company,
      },
      create: {
        id,
        email,
        hashedPassword: EXISTING_HASH,
        name,
        role: "CONTRACTOR",
        phone,
        company,
      },
    })

    contractors.push(contractor)
  }

  for (let i = 0; i < 100; i += 1) {
    const contractor = contractors[i % contractors.length]
    const template = workOrderTemplates[i % workOrderTemplates.length]
    const address = makeAddress(i)
    const status = statuses[i % statuses.length]
    const createdAt = new Date(Date.UTC(2025, i % 12, 1 + (i % 25), 10, 0, 0))
    const dueDate = new Date(Date.UTC(2025, (i + 1) % 12, 5 + (i % 20), 0, 0, 0))
    const assignedDate = ["NEW", "UNASSIGNED"].includes(status) ? null : createdAt
    const startDate = ["IN_PROGRESS", "ASSIGNED", "READ", "FIELD_COMPLETE", "OFFICE_APPROVED", "SENT_TO_CLIENT", "CLOSED"].includes(status)
      ? new Date(Date.UTC(2025, i % 12, 2 + (i % 20), 8, 0, 0))
      : null
    const estCompletion = ["NEW", "UNASSIGNED"].includes(status)
      ? null
      : new Date(Date.UTC(2025, (i + 1) % 12, 10 + (i % 15), 0, 0, 0))
    const fieldComplete = ["FIELD_COMPLETE", "OFFICE_APPROVED", "SENT_TO_CLIENT", "CLOSED"].includes(status)
      ? new Date(Date.UTC(2025, (i + 1) % 12, 8 + (i % 10), 0, 0, 0))
      : null

    await prisma.workOrder.upsert({
      where: { id: `demo_bulk_work_order_${String(i + 1).padStart(3, "0")}` },
      update: {
        title: `${template.title} - ${address.addressLine1}`,
        description: `Demo work order for ${address.addressLine1}, ${address.city}, ${address.state}. Scope includes ${template.title.toLowerCase()} with realistic assignment, scheduling, and pricing data.`,
        addressLine1: address.addressLine1,
        addressLine2: "",
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        serviceType: template.serviceType,
        status,
        dueDate,
        tasks: buildTasks(template.serviceType, i),
        workOrderNumber: `DWO-${String(i + 1).padStart(4, "0")}`,
        coordinator: coordinator.name,
        processor: processor.name,
        gpsLat: 37.0 + ((i % 30) * 0.013),
        gpsLon: -93.0 - ((i % 30) * 0.011),
        lockCode: String(1000 + (i % 9000)),
        lockLocation: i % 2 === 0 ? "Front door" : "Garage side door",
        keyCode: `K${200 + i}`,
        gateCode: i % 3 === 0 ? `G${300 + i}` : "",
        lotSize: `${(0.1 + ((i % 8) * 0.05)).toFixed(2)} acres`,
        assignedDate,
        startDate,
        estCompletion,
        fieldComplete,
        contractorName: contractor.name,
        contractorEmail: contractor.email,
        contractorPhone: contractor.phone,
        clientId: client.id,
        creatorId: creator.id,
        assignedContractorId: status === "UNASSIGNED" || status === "NEW" ? null : contractor.id,
        assignedCoordinatorId: coordinator.id,
        assignedProcessorId: processor.id,
      },
      create: {
        id: `demo_bulk_work_order_${String(i + 1).padStart(3, "0")}`,
        title: `${template.title} - ${address.addressLine1}`,
        description: `Demo work order for ${address.addressLine1}, ${address.city}, ${address.state}. Scope includes ${template.title.toLowerCase()} with realistic assignment, scheduling, and pricing data.`,
        addressLine1: address.addressLine1,
        addressLine2: "",
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        serviceType: template.serviceType,
        status,
        dueDate,
        tasks: buildTasks(template.serviceType, i),
        workOrderNumber: `DWO-${String(i + 1).padStart(4, "0")}`,
        coordinator: coordinator.name,
        processor: processor.name,
        gpsLat: 37.0 + ((i % 30) * 0.013),
        gpsLon: -93.0 - ((i % 30) * 0.011),
        lockCode: String(1000 + (i % 9000)),
        lockLocation: i % 2 === 0 ? "Front door" : "Garage side door",
        keyCode: `K${200 + i}`,
        gateCode: i % 3 === 0 ? `G${300 + i}` : "",
        lotSize: `${(0.1 + ((i % 8) * 0.05)).toFixed(2)} acres`,
        assignedDate,
        startDate,
        estCompletion,
        fieldComplete,
        contractorName: contractor.name,
        contractorEmail: contractor.email,
        contractorPhone: contractor.phone,
        createdAt,
        clientId: client.id,
        creatorId: creator.id,
        assignedContractorId: status === "UNASSIGNED" || status === "NEW" ? null : contractor.id,
        assignedCoordinatorId: coordinator.id,
        assignedProcessorId: processor.id,
      },
    })
  }

  const [demoContractors, demoWorkOrders] = await Promise.all([
    prisma.user.count({ where: { email: { endsWith: "@demo.local" } } }),
    prisma.workOrder.count({ where: { id: { startsWith: "demo_bulk_work_order_" } } }),
  ])

  console.log(JSON.stringify({ demoContractors, demoWorkOrders }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
