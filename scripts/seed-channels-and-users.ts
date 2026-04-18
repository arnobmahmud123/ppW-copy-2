import { PrismaClient, Role, MessageThreadType, MessageVisibilityScope, MessageType, MessageAuthorType } from "../src/generated/prisma"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding channels and users...")

  const hashedPassword = await bcrypt.hash("password123", 12)

  // 1. Create 20 users with dummy avatars
  const roles: Role[] = ["CLIENT", "CONTRACTOR", "COORDINATOR", "PROCESSOR", "ADMIN"]
  const usersToCreate = []

  const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"]
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]

  for (let i = 0; i < 20; i++) {
    const fn = firstNames[i % firstNames.length]
    const ln = lastNames[(i + Math.floor(i / firstNames.length)) % lastNames.length]
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`
    usersToCreate.push({
      email,
      hashedPassword,
      name: `${fn} ${ln}`,
      role: roles[i % roles.length],
      phone: `(555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
      company: roles[i % roles.length] === "CONTRACTOR" ? `${ln} Services` : "Demo Corp",
      avatarUrl: `https://i.pravatar.cc/150?u=${email}`,
    })
  }

  const createdUsers = []
  for (const u of usersToCreate) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { avatarUrl: u.avatarUrl }, // update avatar if already exists
      create: u,
    })
    createdUsers.push(user)
  }

  console.log(`Created ${createdUsers.length} users.`)

  // 2. Create 10 channels with specific logos
  const channelsData = [
    { title: "MCS", channelImageUrl: "https://logo.clearbit.com/mcs360.com" },
    { title: "Servicelink", channelImageUrl: "https://logo.clearbit.com/svclnk.com" },
    { title: "MSI", channelImageUrl: "https://logo.clearbit.com/msiwork.com" },
    { title: "Cyprexx", channelImageUrl: "https://logo.clearbit.com/cyprexx.com" },
    { title: "Altisource", channelImageUrl: "https://logo.clearbit.com/altisource.com" },
    { title: "SingleSource", channelImageUrl: "https://logo.clearbit.com/singlesourceproperty.com" },
    { title: "NFR", channelImageUrl: "https://logo.clearbit.com/nfronline.com" },
    { title: "Guardian Asset", channelImageUrl: "https://logo.clearbit.com/guardianassetmgt.com" },
    { title: "General Hub", channelImageUrl: "https://ui-avatars.com/api/?name=General+Hub&background=random" },
    { title: "Team Alpha", channelImageUrl: "https://ui-avatars.com/api/?name=Team+Alpha&background=random" },
  ]

  for (const ch of channelsData) {
    const existingChannel = await prisma.messageThread.findFirst({
      where: { title: ch.title, threadType: "GENERAL" }
    })

    let threadId = existingChannel?.id

    if (!threadId) {
      // Find all system users to add them as participants too (including admin@test.com, client@test.com, etc)
      const allSystemUsers = await prisma.user.findMany()
      
      const newChannel = await prisma.messageThread.create({
        data: {
          title: ch.title,
          threadType: "GENERAL",
          channelImageUrl: ch.channelImageUrl,
          createdByUserId: createdUsers[0].id,
          participants: {
            create: allSystemUsers.map(user => ({
              userId: user.id
            }))
          }
        }
      })
      threadId = newChannel.id
    } else {
      await prisma.messageThread.update({
        where: { id: threadId },
        data: { channelImageUrl: ch.channelImageUrl }
      })
      
      const allSystemUsers = await prisma.user.findMany()
      for(const sysUser of allSystemUsers) {
         await prisma.messageThreadParticipant.upsert({
            where: { messageThreadId_userId: { messageThreadId: threadId, userId: sysUser.id } },
            update: {},
            create: { messageThreadId: threadId, userId: sysUser.id }
         })
      }
    }
    
    // Create demo messages
    await prisma.workOrderMessage.create({
      data: {
        messageThreadId: threadId,
        visibilityScope: "INTERNAL_ONLY",
        messageType: "COMMENT",
        authorType: "USER",
        body: `Welcome to the ${ch.title} channel! Let's discuss operational updates here.`,
        createdByUserId: createdUsers[Math.floor(Math.random() * createdUsers.length)].id,
      }
    })

    await prisma.workOrderMessage.create({
      data: {
        messageThreadId: threadId,
        visibilityScope: "INTERNAL_ONLY",
        messageType: "COMMENT",
        authorType: "USER",
        body: `Got it! Looking forward to working with everyone.`,
        createdByUserId: createdUsers[Math.floor(Math.random() * createdUsers.length)].id,
      }
    })
  }

  console.log("Created 10 channels with demo data.")
  console.log("Database seeded successfully with users, channels, and conversations.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
