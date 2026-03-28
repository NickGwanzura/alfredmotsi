import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/app/lib/password';

const prisma = new PrismaClient();

// Production Admin Credentials
const ADMIN_EMAIL = "alfred@splashaironline.co.zw";
const ADMIN_PASSWORD = "#631168609K86zw";

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

  // Hash admin password
  const hashedPassword = await hashPassword(ADMIN_PASSWORD);

  // Create Admin User Only
  const admin = await prisma.user.create({
    data: {
      id: "admin1",
      name: "Alfred Motsi",
      role: UserRole.admin,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      phone: "",
    },
  });

  console.log('✅ Admin user created');
  console.log(`   Email: ${ADMIN_EMAIL}`);
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
