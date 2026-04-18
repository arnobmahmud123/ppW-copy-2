const { PrismaClient } = require("../src/generated/prisma");
const bcryptjs = require("bcryptjs");

const prisma = new PrismaClient();

const CHANNEL_DATA = [
  { name: "MCS", logo: "https://via.placeholder.com/150?text=MCS", color: "#3B82F6" },
  { name: "Servicelink", logo: "https://via.placeholder.com/150?text=Servicelink", color: "#10B981" },
  { name: "MSI", logo: "https://via.placeholder.com/150?text=MSI", color: "#F59E0B" },
  { name: "NFR", logo: "https://via.placeholder.com/150?text=NFR", color: "#EF4444" },
  { name: "Guardian Asset", logo: "https://via.placeholder.com/150?text=Guardian", color: "#8B5CF6" },
  { name: "Fiver Brothers", logo: "https://via.placeholder.com/150?text=Fiver", color: "#EC4899" },
  { name: "Single Source", logo: "https://via.placeholder.com/150?text=SingleSource", color: "#14B8A6" },
  { name: "Altisource", logo: "https://via.placeholder.com/150?text=Altisource", color: "#F97316" },
  { name: "Cyprexx", logo: "https://via.placeholder.com/150?text=Cyprexx", color: "#06B6D4" }
];

const USER_PROFILES = [
  { email: "sarah.johnson@email.com", name: "Sarah Johnson", role: "ADMIN" },
  { email: "michael.chen@email.com", name: "Michael Chen", role: "COORDINATOR" },
  { email: "jessica.williams@email.com", name: "Jessica Williams", role: "COORDINATOR" },
  { email: "david.smith@email.com", name: "David Smith", role: "PROCESSOR" },
  { email: "emily.rodriguez@email.com", name: "Emily Rodriguez", role: "PROCESSOR" },
  { email: "james.thompson@email.com", name: "James Thompson", role: "CONTRACTOR" },
  { email: "maria.garcia@email.com", name: "Maria Garcia", role: "CONTRACTOR" },
  { email: "robert.martinez@email.com", name: "Robert Martinez", role: "CONTRACTOR" },
  { email: "sophia.wilson@email.com", name: "Sophia Wilson", role: "CONTRACTOR" },
  { email: "christopher.lewis@email.com", name: "Christopher Lewis", role: "CONTRACTOR" },
  { email: "amanda.clark@email.com", name: "Amanda Clark", role: "CLIENT" },
  { email: "daniel.taylor@email.com", name: "Daniel Taylor", role: "CLIENT" },
  { email: "rachel.anderson@email.com", name: "Rachel Anderson", role: "CLIENT" },
  { email: "matthew.thomas@email.com", name: "Matthew Thomas", role: "CONTRACTOR" },
  { email: "olivia.jackson@email.com", name: "Olivia Jackson", role: "CLIENT" },
  { email: "brandon.white@email.com", name: "Brandon White", role: "CONTRACTOR" },
  { email: "natalie.harris@email.com", name: "Natalie Harris", role: "CLIENT" },
  { email: "kevin.martin@email.com", name: "Kevin Martin", role: "CONTRACTOR" },
  { email: "stephanie.lee@email.com", name: "Stephanie Lee", role: "PROCESSOR" },
  { email: "jonathan.perez@email.com", name: "Jonathan Perez", role: "COORDINATOR" }
];

const DEMO_MESSAGES = [
  "Hi team! Looking forward to collaborating with everyone on this project.",
  "Thanks for the quick response! Let's schedule a meeting to discuss the timeline.",
  "I've reviewed the proposal and everything looks good. Ready to move forward.",
  "Can you provide an update on the current status? We're on track so far.",
  "The inspection is scheduled for next Tuesday at 10 AM. Please confirm your availability.",
  "Great work on completing the first phase! Really impressed with the quality.",
  "I have a few questions about the scope. Can we discuss this further?",
  "Perfect! Let's get started right away. I'll send you all the documentation.",
  "Just completed the paperwork. Everything should be finalized by end of week.",
  "Thank you for your support throughout this process. It's been a pleasure working with you.",
  "We have some updates from the field. Let me share the latest photos.",
  "The client is very satisfied with the progress. Keep up the excellent work!",
  "One small adjustment needed on the final deliverable. Should be quick to fix.",
  "All systems are go! Ready to launch the next phase whenever you are.",
  "Appreciate the teamwork here. This couldn't have been done without everyone's effort."
];

async function main() {
  console.log("🌾 Enhanced seeding: channels, users, and conversations...\n");

  try {
    const hashedPassword = bcryptjs.hashSync("password123", 10);

    // 1. Create 20 users with avatars
    console.log("👥 Creating 20 users with profile photos...");
    let usersCreated = 0;

    for (const profile of USER_PROFILES) {
      const existing = await prisma.user.findUnique({
        where: { email: profile.email }
      });

      if (!existing) {
        await prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            hashedPassword,
            role: profile.role,
            phone: `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
            company: `Company ${Math.floor(Math.random() * 20) + 1}`,
            address: `${Math.floor(Math.random() * 999) + 100} ${["Main", "Oak", "Elm", "Pine", "Maple"][Math.floor(Math.random() * 5)]} St`
          }
        });
        usersCreated++;
        console.log(`  ✓ ${profile.name} (${profile.role})`);
      }
    }

    console.log(`\n✅ Created ${usersCreated} users\n`);

    // 2. Create 9 channels with logos
    console.log("💬 Creating 9 branded channels...");
    let channelsCreated = 0;
    const channelInstances = [];

    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" }
    });

    if (!adminUser) {
      throw new Error("No admin user found to create channels");
    }

    for (const channel of CHANNEL_DATA) {
      const existing = await prisma.messageThread.findFirst({
        where: { title: channel.name, threadType: "GENERAL" }
      });

      if (!existing) {
        const thread = await prisma.messageThread.create({
          data: {
            threadType: "GENERAL",
            title: channel.name,
            channelImageUrl: channel.logo,
            createdByUserId: adminUser.id,
            participants: {
              create: {
                userId: adminUser.id
              }
            }
          }
        });

        channelInstances.push({ thread, channel });
        channelsCreated++;
        console.log(`  ✓ ${channel.name}`);
      }
    }

    console.log(`\n✅ Created ${channelsCreated} channels\n`);

    // 3. Add channel members and demo conversations
    console.log("💬 Adding demo conversations to channels...");
    let messagesCreated = 0;

    for (const { thread, channel } of channelInstances) {
      // Get all users
      const allUsers = await prisma.user.findMany();

      // Add random members to channel
      const memberCount = Math.floor(Math.random() * 8) + 5; // 5-12 members
      const selectedUsers = allUsers.sort(() => Math.random() - 0.5).slice(0, memberCount);

      // Add as participants (without duplicating admin)
      for (const user of selectedUsers) {
        const exists = await prisma.messageThreadParticipant.findFirst({
          where: {
            messageThreadId: thread.id,
            userId: user.id
          }
        });

        if (!exists) {
          await prisma.messageThreadParticipant.create({
            data: {
              messageThreadId: thread.id,
              userId: user.id
            }
          });
        }
      }

      // Add demo messages
      const msgCount = Math.floor(Math.random() * 7) + 3; // 3-10 messages per channel

      for (let i = 0; i < msgCount; i++) {
        const sender = selectedUsers[Math.floor(Math.random() * selectedUsers.length)];
        const message = DEMO_MESSAGES[Math.floor(Math.random() * DEMO_MESSAGES.length)];

        await prisma.workOrderMessage.create({
          data: {
            messageThreadId: thread.id,
            createdByUserId: sender.id,
            body: message,
            subject: `${channel.name} - Message ${i + 1}`,
            messageType: "COMMENT",
            visibilityScope: "CLIENT_VISIBLE"
          }
        });

        messagesCreated++;
      }

      console.log(`  ✓ ${channel.name}: ${selectedUsers.length} members, ${msgCount} messages`);
    }

    console.log(`\n✅ Created ${messagesCreated} demo messages\n`);

    // Summary
    const [totalUsers, totalChannels, totalThreadMessages] = await Promise.all([
      prisma.user.count(),
      prisma.messageThread.count({ where: { threadType: "GENERAL" } }),
      prisma.workOrderMessage.count({
        where: {
          messageThread: {
            threadType: "GENERAL",
          },
        },
      }),
    ]);

    console.log("📊 SEED COMPLETE!");
    console.log("━".repeat(50));
    console.log(`✨ Total Users: ${totalUsers}`);
    console.log(`✨ Total Channels: ${totalChannels}`);
    console.log(`✨ Total Messages: ${totalThreadMessages}`);
    console.log("━".repeat(50));
    console.log("\n🎉 All demo data loaded successfully!");
    console.log("\nTest credentials:");
    console.log("  Email: admin@example.com");
    console.log("  Password: password123\n");

  } catch (error) {
    console.error("❌ Seeding error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
