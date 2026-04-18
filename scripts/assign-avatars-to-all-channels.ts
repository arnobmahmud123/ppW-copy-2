import { PrismaClient } from "../src/generated/prisma"

const prisma = new PrismaClient()

async function main() {
  console.log("Checking channels for missing profile photos...");

  const channels = await prisma.messageThread.findMany({
    where: { 
      threadType: "GENERAL"
    }
  });

  const generateRandomAvatar = (name: string) => {
     return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
  };

  let updatedCount = 0;
  for (const channel of channels) {
    if (!channel.channelImageUrl) {
      const fallbackName = channel.title || "Channel";
      await prisma.messageThread.update({
        where: { id: channel.id },
        data: { channelImageUrl: generateRandomAvatar(fallbackName) }
      });
      updatedCount++;
    }
  }

  console.log(`Successfully assigned a profile photo to ${updatedCount} channels.`);
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
