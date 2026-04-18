// Import PrismaClient from custom generated location
const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding 100 work orders with properties and relationships...\n");

  // Get all users
  const users = await prisma.user.findMany();
  const clients = users.filter(u => u.role === "CLIENT");
  const contractors = users.filter(u => u.role === "CONTRACTOR");
  const coordinators = users.filter(u => u.role === "COORDINATOR");
  const admins = users.filter(u => u.role === "ADMIN");

  console.log(`Found: ${clients.length} clients, ${contractors.length} contractors, ${coordinators.length} coordinators, ${admins.length} admins\n`);

  // Define service types
  const serviceTypes = ["GRASS_CUT", "DEBRIS_REMOVAL", "WINTERIZATION", "BOARD_UP", "INSPECTION", "MOLD_REMEDIATION", "OTHER"];

  // Define work order statuses
  const statuses = ["NEW", "UNASSIGNED", "ASSIGNED", "IN_PROGRESS", "FIELD_COMPLETE", "OFFICE_APPROVED", "SENT_TO_CLIENT", "CLOSED"];

  // Define addresses/properties (create 20 unique properties)
  const properties = [
    { addressLine1: "123 Main St", city: "New York", state: "NY", postalCode: "10001" },
    { addressLine1: "456 Oak Ave", city: "Los Angeles", state: "CA", postalCode: "90001" },
    { addressLine1: "789 Pine Rd", city: "Chicago", state: "IL", postalCode: "60601" },
    { addressLine1: "321 Elm St", city: "Houston", state: "TX", postalCode: "77001" },
    { addressLine1: "654 Maple Dr", city: "Phoenix", state: "AZ", postalCode: "85001" },
    { addressLine1: "987 Cedar Ln", city: "Philadelphia", state: "PA", postalCode: "19101" },
    { addressLine1: "111 Birch Way", city: "San Antonio", state: "TX", postalCode: "78201" },
    { addressLine1: "222 Ash Blvd", city: "San Diego", state: "CA", postalCode: "92101" },
    { addressLine1: "333 Walnut St", city: "Dallas", state: "TX", postalCode: "75201" },
    { addressLine1: "444 Spruce Rd", city: "San Jose", state: "CA", postalCode: "95101" },
    { addressLine1: "555 Poplar Ave", city: "Austin", state: "TX", postalCode: "73301" },
    { addressLine1: "666 Willow Ln", city: "Jacksonville", state: "FL", postalCode: "32099" },
    { addressLine1: "777 Sycamore St", city: "Fort Worth", state: "TX", postalCode: "76102" },
    { addressLine1: "888 Chestnut Dr", city: "Columbus", state: "OH", postalCode: "43085" },
    { addressLine1: "999 Magnolia Way", city: "Charlotte", state: "NC", postalCode: "28202" },
    { addressLine1: "1010 Dogwood Rd", city: "San Francisco", state: "CA", postalCode: "94102" },
    { addressLine1: "1111 Hemlock St", city: "Indianapolis", state: "IN", postalCode: "46202" },
    { addressLine1: "1212 Larch Ave", city: "Austin", state: "TX", postalCode: "73301" },
    { addressLine1: "1313 Juniper Blvd", city: "Seattle", state: "WA", postalCode: "98101" },
    { addressLine1: "1414 Redbud Ln", city: "Denver", state: "CO", postalCode: "80202" },
  ];

  let createdCount = 0;
  let updatedCount = 0;
  let workOrdersPerProperty = [];

  // Create 5 work orders per property = 100 work orders
  for (let propIndex = 0; propIndex < properties.length; propIndex++) {
    const property = properties[propIndex];
    const numWorkOrders = 5; // 5 per property = 100 total

    for (let woIndex = 0; woIndex < numWorkOrders; woIndex++) {
      try {
        // Rotate through available resources
        const sequence = propIndex * 5 + woIndex + 1;
        const client = clients[(sequence - 1) % clients.length];
        const contractor = contractors[(sequence - 1) % contractors.length];
        const coordinator = coordinators[(sequence - 1) % coordinators.length];
        const creator = admins[(sequence - 1) % admins.length];

        const serviceType = serviceTypes[(sequence - 1) % serviceTypes.length];
        const status = statuses[(sequence - 1) % statuses.length];

        const workOrderId = `seed_work_order_${String(sequence).padStart(4, "0")}`;
        const workOrderNumber = `WO-${String(sequence).padStart(4, "0")}`;
        const dueDate = new Date(Date.UTC(2026, (sequence - 1) % 12, 5 + ((sequence - 1) % 20), 0, 0, 0));

        const existing = await prisma.workOrder.findUnique({
          where: { id: workOrderId },
          select: { id: true },
        });

        const workOrder = await prisma.workOrder.upsert({
          where: { id: workOrderId },
          update: {
            title: `${serviceType} at ${property.city} - Property ${propIndex + 1}`,
            description: `Work order #${sequence}: ${serviceType} service required at ${property.addressLine1}, ${property.city}, ${property.state}`,
            addressLine1: property.addressLine1,
            city: property.city,
            state: property.state,
            postalCode: property.postalCode,
            serviceType: serviceType,
            status: status,
            clientId: client.id,
            creatorId: creator.id,
            assignedContractorId: contractor.id,
            assignedCoordinatorId: coordinator.id,
            workOrderNumber,
            dueDate,
          },
          create: {
            id: workOrderId,
            title: `${serviceType} at ${property.city} - Property ${propIndex + 1}`,
            description: `Work order #${sequence}: ${serviceType} service required at ${property.addressLine1}, ${property.city}, ${property.state}`,
            addressLine1: property.addressLine1,
            city: property.city,
            state: property.state,
            postalCode: property.postalCode,
            serviceType: serviceType,
            status: status,
            clientId: client.id,
            creatorId: creator.id,
            assignedContractorId: contractor.id,
            assignedCoordinatorId: coordinator.id,
            workOrderNumber,
            dueDate,
          },
        });

        if (existing) {
          updatedCount++;
        } else {
          createdCount++;
        }
        workOrdersPerProperty.push({
          address: `${property.addressLine1}, ${property.city}`,
          workOrderId: workOrder.id,
          title: workOrder.title,
          status: workOrder.status,
        });

        console.log(`✓ Seeded ${workOrder.workOrderNumber}: ${workOrder.title} - Status: ${status}`);
      } catch (error) {
        console.error(`✗ Error creating work order:`, error.message);
      }
    }
  }

  console.log(`\n✅ Seeded work orders: ${createdCount} created, ${updatedCount} updated.\n`);
  console.log("📍 Properties (5 work orders each):");
  properties.forEach((prop, i) => {
    const count = workOrdersPerProperty.filter(wo => wo.address === `${prop.addressLine1}, ${prop.city}`).length;
    console.log(`   ${i + 1}. ${prop.addressLine1}, ${prop.city}, ${prop.state} - ${count} work orders`);
  });

  console.log(`\n💬 Work order seeding complete!`);
}

main()
  .catch((error) => {
    console.error("Seeding error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
