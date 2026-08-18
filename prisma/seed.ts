import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/app/lib/password';
import crypto from 'node:crypto';

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

  const checklistSeeds = [
    ['AC Installation', 'installation', ['Confirm site and mounting position', 'Pressure-test pipework', 'Vacuum system', 'Verify electrical supply and isolator', 'Commission unit and record delta T', 'Customer operation handover']],
    ['AC Servicing', 'maintenance', ['Inspect and clean filters', 'Clean indoor and outdoor coils', 'Inspect drain and condensate flow', 'Record voltage and running current', 'Record suction and discharge pressure', 'Verify operating temperatures']],
    ['AC Repair', 'repair', ['Confirm reported fault', 'Complete electrical diagnostics', 'Inspect refrigerant circuit for leaks', 'Record diagnosis', 'Test repaired system', 'Explain repair to customer']],
    ['Refrigeration Repair', 'repair', ['Record cabinet or room temperature', 'Inspect controller and sensors', 'Check compressor and fans', 'Leak-test refrigerant circuit', 'Record pressures and refrigerant used', 'Verify pull-down performance']],
    ['Cold Room Maintenance', 'maintenance', ['Inspect door seals and panels', 'Clean evaporator and condenser', 'Inspect drains and defrost cycle', 'Check compressor and fan motors', 'Record temperatures and pressures', 'Check alarms and controls']],
    ['Site Inspection', 'inspection', ['Confirm customer requirements', 'Measure service area', 'Inspect power availability', 'Identify equipment and routing options', 'Record access and safety risks', 'Capture site photos']],
    ['Preventive Maintenance', 'maintenance', ['Review equipment service history', 'Complete visual and safety inspection', 'Clean serviceable components', 'Record electrical readings', 'Record pressures and temperatures', 'List recommended corrective actions']],
  ] as const;
  for (const [name, jobType, items] of checklistSeeds) {
    await prisma.checklistTemplate.upsert({
      where: { name }, update: { isActive: true },
      create: { name, jobType, items: { create: items.map((label, sortOrder) => ({ label, sortOrder, requiresPhoto: sortOrder === 0 || sortOrder === items.length - 1 })) } },
    });
  }

  const pricebookSeeds = [
    ['CALL-OUT', 'Call-out fee', 'Call-out', 45], ['AC-INSTALL', 'AC installation', 'Installation', 350],
    ['AC-SERVICE', 'AC servicing', 'Service', 85], ['GAS-REFILL', 'Gas refill', 'Refrigerant', 120],
    ['COMP-REPLACE', 'Compressor replacement', 'Repair', 450], ['THERMO-REPLACE', 'Thermostat replacement', 'Repair', 95],
    ['COLD-INSPECT', 'Cold room inspection', 'Inspection', 150], ['PM-VISIT', 'Preventive maintenance visit', 'Maintenance', 110],
  ] as const;
  for (const [code, name, category, sellPrice] of pricebookSeeds) {
    await prisma.pricebookItem.upsert({ where: { code }, update: { name, category, sellPrice, isActive: true }, create: { code, name, category, sellPrice, unit: 'service' } });
  }

  for (const item of [
    { sku: 'CAP-35UF', name: '35uF Run Capacitor', category: 'Electrical', unit: 'pcs', stockLevel: 8, reorderLevel: 3, reorderQty: 10, costPrice: 8, sellPrice: 18, supplier: 'Demo HVAC Supplies' },
    { sku: 'FILTER-12K', name: '12,000 BTU Split Filter', category: 'Filters', unit: 'pcs', stockLevel: 4, reorderLevel: 4, reorderQty: 8, costPrice: 5, sellPrice: 12, supplier: 'Demo HVAC Supplies' },
    { sku: 'COPPER-14', name: '1/4 inch Copper Tube', category: 'Pipework', unit: 'm', stockLevel: 25, reorderLevel: 10, reorderQty: 30, costPrice: 3.5, sellPrice: 7, supplier: 'Demo HVAC Supplies' },
  ]) {
    await prisma.inventoryItem.upsert({ where: { sku: item.sku }, update: {}, create: item });
  }

  if (process.env.SEED_DEMO_DATA === 'true') {
    if (!process.env.SEED_DEMO_PASSWORD) {
      console.log('⚠️ SEED_DEMO_DATA=true but SEED_DEMO_PASSWORD is missing — skipping demo records');
      return;
    }
    const demoPassword = await hashPassword(process.env.SEED_DEMO_PASSWORD);
    const tech = await prisma.user.upsert({ where: { email: 'tech.demo@splashair.local' }, update: {}, create: { name: 'Tawanda Demo Technician', email: 'tech.demo@splashair.local', role: 'tech', password: demoPassword, passwordChanged: false, phone: '+263 77 000 0001', specialty: 'Air conditioning and refrigeration', status: 'available' } });
    const customer = await prisma.customer.upsert({ where: { email: 'facilities.demo@example.com' }, update: {}, create: { name: 'Demo Retail Centre', address: '12 Sample Avenue, Harare', siteAddress: '12 Sample Avenue, Harare', phone: '+263 77 000 0002', whatsapp: '+263 77 000 0002', email: 'facilities.demo@example.com', notes: 'Demonstration customer for Service Operations flows.', portalCode: crypto.randomBytes(6).toString('hex').toUpperCase() } });
    let site = await prisma.serviceSite.findFirst({ where: { customerId: customer.id, name: 'Main Retail Site' } });
    site ||= await prisma.serviceSite.create({ data: { customerId: customer.id, name: 'Main Retail Site', address: customer.address, isPrimary: true, accessNotes: 'Report to facilities office.' } });
    let equipment = await prisma.equipment.findFirst({ where: { siteId: site.id, serialNumber: 'DEMO-AC-001' } });
    equipment ||= await prisma.equipment.create({ data: { customerId: customer.id, siteId: site.id, unitType: 'Split_System', name: 'Sales Floor AC', brand: 'DemoCool', model: 'DC-24000', serialNumber: 'DEMO-AC-001', installDate: '2025-03-10', warrantyExpiry: '2028-03-09' } });
    await prisma.job.upsert({ where: { jobCardRef: 'JOB-DEMO-001' }, update: {}, create: { source: 'admin', customerId: customer.id, siteId: site.id, equipmentId: equipment.id, title: 'Quarterly AC preventive maintenance', type: 'maintenance', unitType: 'Split_System', issue: 'service', priority: 'normal', date: new Date().toISOString().slice(0, 10), time: '09:00', durationMinutes: 120, status: 'scheduled', description: 'Complete quarterly checklist and record all readings.', photos: [], alerts: [], jobCardRef: 'JOB-DEMO-001', technicians: { connect: { id: tech.id } } } });
    console.log('✅ Demo customer, site, equipment, technician and job created');
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
