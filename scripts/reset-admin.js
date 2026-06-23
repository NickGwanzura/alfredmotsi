// Run: node scripts/reset-admin.js
// This resets the admin password directly using bcryptjs
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('🔧 Resetting admin passwords...');

  const adminEmail = "alfred@splashaircrmzw.site";
  const adminPassword = "#631168609K86zw";
  const superadminEmail = "nicholas.gwanzura@outlook.com";
  const superadminPassword = "Zubi_2026$";

  const hashedPassword = await hashPassword(adminPassword);
  const hashedSuperadminPassword = await hashPassword(superadminPassword);

  // Check current enum values
  const enumResult = await prisma.$queryRawUnsafe(
    `SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')`
  );
  console.log('Available UserRole enum values:', enumResult.map(r => r.enumlabel));

  // Upsert admin 1
  const admin1 = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      passwordChanged: true,
    },
    create: {
      name: "Alfred Motsi",
      role: "admin",
      email: adminEmail,
      password: hashedPassword,
      passwordChanged: true,
      phone: "",
    },
  });
  console.log('✅ Admin 1 reset:', admin1.email, 'role:', admin1.role);

  // Upsert superadmin
  const admin2 = await prisma.user.upsert({
    where: { email: superadminEmail },
    update: {
      password: hashedSuperadminPassword,
      passwordChanged: true,
    },
    create: {
      name: "Nicholas Gwanzura",
      role: "admin",
      email: superadminEmail,
      password: hashedSuperadminPassword,
      passwordChanged: true,
      phone: "",
    },
  });
  console.log('✅ Admin 2 reset:', admin2.email, 'role:', admin2.role);

  console.log('\n🎉 Admin passwords reset successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
