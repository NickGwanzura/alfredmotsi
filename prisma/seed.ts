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

  // Hash passwords
  const hashedPassword = await hashPassword(ADMIN_PASSWORD);
  const hashedSuperadminPassword = await hashPassword(SUPERADMIN_PASSWORD);

  // Check if admin1 exists
  const existingAdmin1 = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existingAdmin1) {
    console.log('✅ Admin 1 already exists:', ADMIN_EMAIL);
  } else {
    await prisma.user.create({
      data: {
        name: "Alfred Motsi",
        role: UserRole.admin,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        phone: "",
      },
    });
    console.log('✅ Created Admin 1:', ADMIN_EMAIL);
  }

  // Check if admin2 exists
  const existingAdmin2 = await prisma.user.findUnique({
    where: { email: SUPERADMIN_EMAIL },
  });

  if (existingAdmin2) {
    console.log('✅ Admin 2 already exists:', SUPERADMIN_EMAIL);
  } else {
    await prisma.user.create({
      data: {
        name: "Nicholas Gwanzura",
        role: UserRole.admin,
        email: SUPERADMIN_EMAIL,
        password: hashedSuperadminPassword,
        phone: "",
      },
    });
    console.log('✅ Created Admin 2:', SUPERADMIN_EMAIL);
  }

  console.log('\n🎉 Production database seed completed!');
  console.log('\n📋 Admin Credentials:');
  console.log('   Email:', ADMIN_EMAIL);
  console.log('   Password:', ADMIN_PASSWORD);
  console.log('\n   Email:', SUPERADMIN_EMAIL);
  console.log('   Password:', SUPERADMIN_PASSWORD);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
