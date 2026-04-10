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
  console.log('🔧 Resetting admin passwords...');

  // Hash passwords
  const hashedPassword = await hashPassword(ADMIN_PASSWORD);
  const hashedSuperadminPassword = await hashPassword(SUPERADMIN_PASSWORD);

  // Reset Admin Users (force update passwords)
  const admin1 = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      password: hashedPassword,
      passwordChanged: true, // Reset to true so they don't get stuck in loop
    },
    create: {
      name: "Alfred Motsi",
      role: UserRole.admin,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      passwordChanged: true,
      phone: "",
    },
  });

  const admin2 = await prisma.user.upsert({
    where: { email: SUPERADMIN_EMAIL },
    update: {
      password: hashedSuperadminPassword,
      passwordChanged: true, // Reset to true so they don't get stuck in loop
    },
    create: {
      name: "Nicholas Gwanzura",
      role: UserRole.admin,
      email: SUPERADMIN_EMAIL,
      password: hashedSuperadminPassword,
      passwordChanged: true,
      phone: "",
    },
  });

  console.log('✅ Admin passwords reset successfully!');
  console.log(`   ${admin1.email}`);
  console.log(`   ${admin2.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
