const { PrismaClient, Role } = require("../src/generated/prisma");
const bcryptjs = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with users...\n");

  const hashedPassword = bcryptjs.hashSync("password123", 10);

  const users = [
    { email: "admin@example.com", name: "Admin User", hashedPassword, role: "ADMIN", phone: "+1-555-0101", company: "System Admin", address: "123 Admin St, Admin City, AC 12345" },
    { email: "admin2@example.com", name: "Super Admin", hashedPassword, role: "ADMIN", phone: "+1-555-0102", company: "System Admin", address: "456 Control Ave, Admin City, AC 67890" },
    { email: "coordinator@example.com", name: "John Coordinator", hashedPassword, role: "COORDINATOR", phone: "+1-555-0201", company: "Coordination Team", address: "789 Dispatch Rd, Coord City, CC 11111" },
    { email: "coordinator2@example.com", name: "Sarah Coordinator", hashedPassword, role: "COORDINATOR", phone: "+1-555-0202", company: "Coordination Team", address: "321 Schedule Ln, Coord City, CC 22222" },
    { email: "processor@example.com", name: "Mike Processor", hashedPassword, role: "PROCESSOR", phone: "+1-555-0301", company: "Processing Dept", address: "654 Invoice Way, Process City, PC 33333" },
    { email: "processor2@example.com", name: "Emma Processor", hashedPassword, role: "PROCESSOR", phone: "+1-555-0302", company: "Processing Dept", address: "987 Billing St, Process City, PC 44444" },
    { email: "contractor@example.com", name: "Bob Contractor", hashedPassword, role: "CONTRACTOR", phone: "+1-555-0401", company: "ABC Contracting", address: "111 Work Ave, Trade City, TC 55555" },
    { email: "contractor2@example.com", name: "Lisa Contractor", hashedPassword, role: "CONTRACTOR", phone: "+1-555-0402", company: "XYZ Services", address: "222 Service Rd, Trade City, TC 66666" },
    { email: "contractor3@example.com", name: "James Contractor", hashedPassword, role: "CONTRACTOR", phone: "+1-555-0403", company: "Pro Builders LLC", address: "333 Build Ln, Trade City, TC 77777" },
    { email: "contractor4@example.com", name: "Rachel Contractor", hashedPassword, role: "CONTRACTOR", phone: "+1-555-0404", company: "Quality Repairs", address: "444 Fix Way, Trade City, TC 88888" },
    { email: "client@example.com", name: "David Client", hashedPassword, role: "CLIENT", phone: "+1-555-0501", company: "Client Corp", address: "555 Customer Blvd, Client City, CC 99999" },
    { email: "client2@example.com", name: "Jennifer Client", hashedPassword, role: "CLIENT", phone: "+1-555-0502", company: "Business Inc", address: "666 Account St, Client City, CC 10101" },
    { email: "client3@example.com", name: "Robert Client", hashedPassword, role: "CLIENT", phone: "+1-555-0503", company: "Enterprise Co", address: "777 Property Rd, Client City, CC 11212" },
    { email: "client4@example.com", name: "Michelle Client", hashedPassword, role: "CLIENT", phone: "+1-555-0504", company: "Holdings LLC", address: "888 Asset Ave, Client City, CC 12323" },
  ];

  let createdCount = 0;
  for (const user of users) {
    try {
      const existing = await prisma.user.findUnique({ where: { email: user.email } });
      if (existing) {
        console.log(`✓ User already exists: ${user.email} (${user.role})`);
      } else {
        await prisma.user.create({ data: user });
        console.log(`✓ Created user: ${user.email} (${user.role})`);
        createdCount++;
      }
    } catch (error) {
      console.error(`✗ Error creating user ${user.email}:`, error.message);
    }
  }

  console.log(`\n✅ Seed complete! Created ${createdCount} new users.\n`);
  console.log("📋 User Summary:");
  console.log("   Admins: 2");
  console.log("   Coordinators: 2");
  console.log("   Processors: 2");
  console.log("   Contractors: 4");
  console.log("   Clients: 4");
  console.log("\n🔑 All users have password: password123\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
