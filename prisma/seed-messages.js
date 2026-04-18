// Import PrismaClient from custom generated location
const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  console.log("💬 Seeding message threads for work orders...\n");

  try {
    // Get all users and work orders
    const users = await prisma.user.findMany();
    const workOrders = await prisma.workOrder.findMany({
      take: 20 // Create messages for first 20 work orders
    });

    if (users.length === 0 || workOrders.length === 0) {
      console.log("No users or work orders found to create threads");
      return;
    }

    const clients = users.filter(u => u.role === "CLIENT");
    const contractors = users.filter(u => u.role === "CONTRACTOR");
    const coordinators = users.filter(u => u.role === "COORDINATOR");
    const admins = users.filter(u => u.role === "ADMIN");

    let threadsCreated = 0;
    let messagesCreated = 0;

    // Create a thread for each work order
    for (const wo of workOrders) {
      try {
        // Pick participants for this thread
        const coordinator = coordinators[Math.floor(Math.random() * coordinators.length)];
        const contractor = contractors[Math.floor(Math.random() * contractors.length)];
        const client = clients[Math.floor(Math.random() * clients.length)];
        const admin = admins[Math.floor(Math.random() * admins.length)];

        // Create thread
        const thread = await prisma.messageThread.create({
          data: {
            threadType: "WORK_ORDER",
            workOrderId: wo.id,
            title: `${wo.serviceType} - ${wo.workOrderNumber}`,
            createdByUserId: coordinator.id,
            participants: {
              create: [
                { userId: coordinator.id },
                { userId: contractor.id },
                { userId: client.id },
                { userId: admin.id }
              ]
            }
          }
        });

        threadsCreated++;

        // Create 2-4 messages in the thread
        const messageCount = Math.floor(Math.random() * 3) + 2;
        const possibleSenders = [coordinator, contractor, client, admin];
        const messages = [
          `Work order assigned: ${wo.title}`,
          `This property requires ${wo.serviceType}. Let's coordinate the schedule.`,
          `I can start work next week. Please confirm the date and any specific requirements.`,
          `Thanks, that works for us. Let's plan the inspection for next Monday.`,
        ];

        for (let i = 0; i < messageCount && i < messages.length; i++) {
          const sender = possibleSenders[Math.floor(Math.random() * possibleSenders.length)];

          await prisma.workOrderMessage.create({
            data: {
              messageThreadId: thread.id,
              workOrderId: wo.id,
              body: messages[i],
              createdByUserId: sender.id,
              visibilityScope: "CONTRACTOR_VISIBLE",
              messageType: "COMMENT"
            }
          });

          messagesCreated++;
        }

        console.log(`✓ Created thread for ${wo.workOrderNumber}: ${messagesCreated - (messagesCreated % 4)} messages`);
      } catch (error) {
        console.error(`✗ Error creating thread for ${wo.workOrderNumber}:`, error.message);
      }
    }

    console.log(`\n✅ Message seeding complete!`);
    console.log(`   - Created ${threadsCreated} message threads`);
    console.log(`   - Created ${messagesCreated} messages`);
  } catch (error) {
    console.error("Seeding error:", error);
  }
}

main()
  .catch((error) => {
    console.error("Seeding error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
