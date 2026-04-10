import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/app/lib/password';

const prisma = new PrismaClient();

// Production Admin Credentials
const ADMIN_EMAIL = "alfred@splashaircrmzw.site";
const ADMIN_PASSWORD = "#631168609K86zw";

// Superadmin credentials
const SUPERADMIN_EMAIL = "nicholas.gwanzura@outlook.com";
const SUPERADMIN_PASSWORD = "Zubi_2026$";

async function main() {
  console.log('🌱 Starting production database seed...');

  // Clean ALL existing data (respect foreign key constraints)
  await prisma.cRMRecord.deleteMany();
  await prisma.gasUsageRecord.deleteMany();
  await prisma.gasStockItem.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.historyEntry.deleteMany();
  await prisma.diagnostics.deleteMany();
  await prisma.recurringSchedule.deleteMany();
  await prisma.job.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleaned existing data');

  // Hash passwords
  const hashedPassword = await hashPassword(ADMIN_PASSWORD);
  const hashedSuperadminPassword = await hashPassword(SUPERADMIN_PASSWORD);

  // Create Admin Users
  await prisma.user.create({
    data: {
      id: "admin1",
      name: "Alfred Motsi",
      role: UserRole.admin,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      phone: "",
    },
  });

  await prisma.user.create({
    data: {
      id: "admin2",
      name: "Nicholas Gwanzura",
      role: UserRole.admin,
      email: SUPERADMIN_EMAIL,
      password: hashedSuperadminPassword,
      phone: "",
    },
  });

  console.log('✅ Admin users created');
  console.log(`   ${ADMIN_EMAIL}`);
  console.log(`   ${SUPERADMIN_EMAIL}`);
  console.log('   Platform is ready for production!');
  console.log('\n🎉 Production database seed completed!');
  console.log('\n📋 Next steps:');
  console.log('   1. Log in with the admin credentials');
  console.log('   2. Add technicians from the dashboard');
  console.log('   3. Add customers from the CRM');
  console.log('   4. Start creating jobs');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
