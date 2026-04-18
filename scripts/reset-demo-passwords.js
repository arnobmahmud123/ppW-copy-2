const bcryptjs = require("bcryptjs");
const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();
const DEMO_PASSWORD = "password123";

async function main() {
  const hashedPassword = bcryptjs.hashSync(DEMO_PASSWORD, 12);
  const demoEmailMatchers = [
    { endsWith: "@example.com" },
    { endsWith: "@email.com" },
    { endsWith: "@demo.local" },
  ];

  const demoUsers = await prisma.user.findMany({
    where: {
      OR: demoEmailMatchers.map((rule) => ({
        email: {
          endsWith: rule.endsWith,
        },
      })),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  for (const user of demoUsers) {
    await prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword },
    });
  }

  console.log(
    JSON.stringify(
      {
        resetUsers: demoUsers.length,
        password: DEMO_PASSWORD,
        adminAccounts: demoUsers
          .filter((user) => user.role === "ADMIN")
          .map((user) => ({ email: user.email, name: user.name })),
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
