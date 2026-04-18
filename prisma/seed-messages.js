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
    let threadsReused = 0;

    // Create a thread for each work order
    for (const wo of workOrders) {
      try {
        // Pick participants for this thread
        const baseIndex = threadsCreated + threadsReused;
        const coordinator = coordinators[baseIndex % coordinators.length];
        const contractor = contractors[baseIndex % contractors.length];
        const client = clients[baseIndex % clients.length];
        const admin = admins[baseIndex % admins.length];

        let thread = await prisma.messageThread.findFirst({
          where: {
            workOrderId: wo.id,
            threadType: "WORK_ORDER",
          },
          include: {
            participants: true,
            messages: {
              select: { id: true },
              take: 1,
            },
          },
        });

        if (!thread) {
          thread = await prisma.messageThread.create({
            data: {
              id: `seed_work_order_thread_${wo.id}`,
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
            },
            include: {
              participants: true,
              messages: {
                select: { id: true },
                take: 1,
              },
            },
          });

          threadsCreated++;
        } else {
          threadsReused++;
        }

        const existingParticipantIds = new Set(thread.participants.map((participant) => participant.userId));
        const participantIds = [coordinator.id, contractor.id, client.id, admin.id];
        for (const userId of participantIds) {
          if (!existingParticipantIds.has(userId)) {
            await prisma.messageThreadParticipant.create({
              data: {
                messageThreadId: thread.id,
                userId,
              },
            });
          }
        }

        if (thread.messages.length > 0) {
          console.log(`✓ Reused thread for ${wo.workOrderNumber}: existing conversation kept`);
          continue;
        }

        // Create 2-4 messages in the thread
        const messageCount = (baseIndex % 3) + 2;
        const possibleSenders = [coordinator, contractor, client, admin];
        const messages = [
          `Work order assigned: ${wo.title}`,
          `This property requires ${wo.serviceType}. Let's coordinate the schedule.`,
          `I can start work next week. Please confirm the date and any specific requirements.`,
          `Thanks, that works for us. Let's plan the inspection for next Monday.`,
        ];

        for (let i = 0; i < messageCount && i < messages.length; i++) {
          const sender = possibleSenders[i % possibleSenders.length];

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

        console.log(`✓ Seeded thread for ${wo.workOrderNumber}: ${messageCount} starter messages`);
      } catch (error) {
        console.error(`✗ Error creating thread for ${wo.workOrderNumber}:`, error.message);
      }
    }

    console.log(`\n✅ Message seeding complete!`);
    console.log(`   - Created ${threadsCreated} message threads`);
    console.log(`   - Reused ${threadsReused} existing message threads`);
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
