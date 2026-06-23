import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/app/lib/password';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Production Admin Credentials — from environment variables
  // Set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD
  // to configure initial admin users.
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const superadminEmail = process.env.SEED_SUPERADMIN_EMAIL;
  const superadminPassword = process.env.SEED_SUPERADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const hashedPassword = await hashPassword(adminPassword);
    const existingAdmin1 = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin1) {
      console.log('✅ Admin 1 already exists:', adminEmail);
      if (!existingAdmin1.passwordChanged) {
        await prisma.user.update({
          where: { email: adminEmail },
          data: { passwordChanged: true },
        });
        console.log('   Updated passwordChanged to true');
      }
    } else {
      await prisma.user.create({
        data: {
          name: "Alfred Motsi",
          role: UserRole.admin,
          email: adminEmail,
          password: hashedPassword,
          passwordChanged: true,
          phone: "",
        },
      });
      console.log('✅ Created Admin 1:', adminEmail);
    }
  } else {
    console.log('⚠️ SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set — skipping admin 1');
  }

  if (superadminEmail && superadminPassword) {
    const hashedSuperadminPassword = await hashPassword(superadminPassword);
    const existingAdmin2 = await prisma.user.findUnique({
      where: { email: superadminEmail },
    });

    if (existingAdmin2) {
      console.log('✅ Admin 2 already exists:', superadminEmail);
      if (!existingAdmin2.passwordChanged) {
        await prisma.user.update({
          where: { email: superadminEmail },
          data: { passwordChanged: true },
        });
        console.log('   Updated passwordChanged to true');
      }
    } else {
      await prisma.user.create({
        data: {
          name: "Nicholas Gwanzura",
          role: UserRole.admin,
          email: superadminEmail,
          password: hashedSuperadminPassword,
          passwordChanged: true,
          phone: "",
        },
      });
      console.log('✅ Created Admin 2:', superadminEmail);
    }
  } else {
    console.log('⚠️ SEED_SUPERADMIN_EMAIL/SEED_SUPERADMIN_PASSWORD not set — skipping admin 2');
  }

  console.log('\n🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
