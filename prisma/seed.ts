import { PrismaClient, UserRole, TechStatus, JobType, JobStatus, JobPriority, IssueType, UnitType, RefrigerantType, SystemStatus, JobSource, CRMType, CRMOutcome } from '@prisma/client';
import { hashPassword } from '../src/app/lib/password';

const prisma = new PrismaClient();

const ADMIN_EMAIL = "alfred@splashair.co.za";

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (respect foreign key constraints)
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
  const adminPassword = await hashPassword("admin123");
  const techPassword = await hashPassword("tech123");

  // Seed Users
  const admin = await prisma.user.create({
    data: {
      id: "admin1",
      name: "Alfred Motsi",
      role: UserRole.admin,
      email: ADMIN_EMAIL,
      password: adminPassword,
      phone: "011 000 0001",
    },
  });

  const tech1 = await prisma.user.create({
    data: {
      id: "tech1",
      name: "Sipho Dlamini",
      role: UserRole.tech,
      email: "sipho@splashair.co.za",
      password: techPassword,
      phone: "071 234 5678",
      specialty: "Installation",
      status: TechStatus.available,
    },
  });

  const tech2 = await prisma.user.create({
    data: {
      id: "tech2",
      name: "Themba Nkosi",
      role: UserRole.tech,
      email: "themba@splashair.co.za",
      password: techPassword,
      phone: "082 345 6789",
      specialty: "Maintenance",
      status: TechStatus.on_site,
    },
  });

  const tech3 = await prisma.user.create({
    data: {
      id: "tech3",
      name: "Lerato Sithole",
      role: UserRole.tech,
      email: "lerato@splashair.co.za",
      password: techPassword,
      phone: "060 456 7890",
      specialty: "Repairs",
      status: TechStatus.in_transit,
    },
  });

  console.log('✅ Seeded users');
  console.log('   Admin: alfred@splashair.co.za / admin123');
  console.log('   Techs: sipho@splashair.co.za / tech123 (and others)');

  // Seed Customers
  const customers = await prisma.customer.createMany({
    data: [
      {
        id: "C001",
        name: "Sandton City Office Park",
        address: "5 Alice Lane, Sandton, JHB",
        siteAddress: "5 Alice Lane, Sandton, JHB",
        phone: "011 881 2000",
        whatsapp: "27118812000",
        email: "facilities@sandtoncity.co.za",
        portalCode: "SC2024",
        portalEnabled: true,
      },
      {
        id: "C002",
        name: "Rosebank Mall Administration",
        address: "50 Bath Avenue, Rosebank, JHB",
        siteAddress: "50 Bath Avenue, Rosebank, JHB",
        phone: "011 788 1400",
        whatsapp: "27117881400",
        email: "ops@rosebankmall.co.za",
        portalCode: "RM2024",
        portalEnabled: true,
      },
      {
        id: "C003",
        name: "Woolworths Fourways",
        address: "Cnr William Nicol & Witkoppen, Fourways",
        siteAddress: "Cnr William Nicol & Witkoppen, Fourways",
        phone: "011 465 5100",
        whatsapp: "27114655100",
        email: "fm@woolworths.co.za",
        portalCode: "WW2024",
        portalEnabled: false,
      },
      {
        id: "C004",
        name: "Discovery Health Parktown",
        address: "1 Discovery Place, Sandton, JHB",
        siteAddress: "1 Discovery Place, Sandton, JHB",
        phone: "011 529 2888",
        whatsapp: "27115292888",
        email: "facilities@discovery.co.za",
        portalCode: "DH2024",
        portalEnabled: true,
      },
      {
        id: "C005",
        name: "Kyalami Estate HOA",
        address: "Kyalami Estate, Midrand",
        siteAddress: "Kyalami Estate, Midrand",
        phone: "011 466 7700",
        whatsapp: "27114667700",
        email: "admin@kyalami.co.za",
        portalCode: "KY2024",
        portalEnabled: true,
      },
    ],
  });

  console.log('✅ Seeded customers');

  // Seed Jobs
  const today = new Date();
  const ds = (offset: number, h: number, m = 0) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return {
      date: d.toISOString().split("T")[0],
      time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    };
  };

  const job1 = await prisma.job.create({
    data: {
      id: "JOB-001",
      source: JobSource.admin,
      customerId: "C001",
      title: "Boardroom Unit Installation",
      type: JobType.installation,
      unitType: UnitType.Split_System,
      issue: IssueType.install,
      priority: JobPriority.high,
      ...ds(0, 8),
      status: JobStatus.in_progress,
      clockIn: "08:05",
      description: "Install 2x Samsung 18000 BTU splits in boardrooms A and B.",
      photos: [],
      jobCardRef: "JC-001",
      alerts: [],
      technicians: { connect: [{ id: "tech1" }] },
    },
  });

  const job2 = await prisma.job.create({
    data: {
      id: "JOB-002",
      source: JobSource.admin,
      customerId: "C002",
      title: "Annual Service — 6 Ducted Units",
      type: JobType.maintenance,
      unitType: UnitType.Ducted,
      issue: IssueType.service,
      priority: JobPriority.medium,
      ...ds(0, 10, 30),
      status: JobStatus.on_site,
      clockIn: "10:45",
      description: "Annual service of 6 ducted units in admin wing.",
      photos: ["before_unit1.jpg"],
      jobCardRef: "JC-002",
      alerts: [],
      technicians: { connect: [{ id: "tech2" }] },
      diagnostics: {
        create: {
          voltage: "232",
          current: "14.2",
          avgTemp: "22",
          maxTemp: "40",
          suction: "68",
          discharge: "245",
          refrigerantType: RefrigerantType.R_410A,
          refrigerantRecovered: 0.5,
          refrigerantUsed: 1.2,
          refrigerantReused: 0.3,
          status: SystemStatus.optimal,
          notes: "All units running normally.",
          deltaT: "11",
        },
      },
      comments: {
        create: {
          author: "Themba Nkosi",
          text: "3 of 6 done.",
          time: "11:20",
        },
      },
      recurring: {
        create: {
          interval: 6,
          unit: "months",
        },
      },
    },
  });

  const job3 = await prisma.job.create({
    data: {
      id: "JOB-003",
      source: JobSource.admin,
      customerId: "C003",
      title: "Emergency Compressor Repair",
      type: JobType.repair,
      unitType: UnitType.Split_System,
      issue: IssueType.repair,
      priority: JobPriority.urgent,
      ...ds(-1, 14),
      status: JobStatus.completed,
      clockIn: "14:10",
      clockOut: "15:45",
      description: "Unit tripping breaker. Inspect compressor and electrical.",
      photos: ["before.jpg", "after.jpg"],
      signature: "Customer signed",
      jobCardRef: "JC-003",
      alerts: [],
      technicians: { connect: [{ id: "tech3" }] },
      diagnostics: {
        create: {
          voltage: "228",
          current: "18.9",
          avgTemp: "24",
          maxTemp: "40",
          suction: "55",
          discharge: "290",
          refrigerantType: RefrigerantType.R_32,
          refrigerantRecovered: 1.1,
          refrigerantUsed: 0,
          refrigerantReused: 0.8,
          status: SystemStatus.optimal,
          notes: "Faulty capacitor replaced. Unit running well.",
          deltaT: "13",
        },
      },
      history: {
        create: {
          date: ds(-90, 14).date,
          note: "Previous repair — fan motor.",
        },
      },
    },
  });

  await prisma.job.createMany({
    data: [
      {
        id: "JOB-004",
        source: JobSource.admin,
        customerId: "C005",
        title: "Sales Quote — 10 Unit Install",
        type: JobType.sales,
        unitType: UnitType.Multi_Head,
        issue: IssueType.quote,
        priority: JobPriority.medium,
        ...ds(2, 9),
        status: JobStatus.scheduled,
        description: "Site visit for 10-unit installation quote.",
        photos: [],
        jobCardRef: "JC-004",
        alerts: [],
      },
      {
        id: "JOB-005",
        source: JobSource.admin,
        customerId: "C004",
        title: "HEPA Filter Replacement",
        type: JobType.maintenance,
        unitType: UnitType.Ducted,
        issue: IssueType.service,
        priority: JobPriority.low,
        ...ds(3, 7),
        status: JobStatus.scheduled,
        description: "Replace HEPA filters in 4 units on floor 3.",
        photos: [],
        jobCardRef: "JC-005",
        alerts: [],
      },
      {
        id: "JOB-006",
        source: JobSource.admin,
        customerId: "C001",
        title: "Cold Room Refrigeration Service",
        type: JobType.maintenance,
        unitType: UnitType.Refrigeration_System,
        issue: IssueType.service,
        priority: JobPriority.medium,
        ...ds(5, 9),
        status: JobStatus.unallocated,
        description: "Full service on walk-in cold room refrigeration units. ODS check required.",
        photos: [],
        jobCardRef: "JC-006",
        alerts: [],
      },
      {
        id: "JOB-007",
        source: JobSource.admin,
        customerId: "C003",
        title: "AC Installation — New Fourways Branch",
        type: JobType.installation,
        unitType: UnitType.Cassette,
        issue: IssueType.install,
        priority: JobPriority.high,
        ...ds(7, 8),
        status: JobStatus.unallocated,
        description: "Install 4 cassette units in new branch.",
        photos: [],
        jobCardRef: "JC-007",
        alerts: [],
      },
      {
        id: "JOB-008",
        source: JobSource.admin,
        customerId: "C004",
        title: "R-22 Recovery & Retrofit",
        type: JobType.repair,
        unitType: UnitType.Ducted,
        issue: IssueType.repair,
        priority: JobPriority.high,
        ...ds(-3, 9),
        status: JobStatus.completed,
        clockIn: "09:00",
        clockOut: "13:30",
        description: "Recover R-22 from old system and retrofit to R-407C.",
        photos: ["r22_recovery.jpg"],
        signature: "Customer signed",
        jobCardRef: "JC-008",
        alerts: [],
      },
    ],
  });

  // Connect technicians to jobs
  await prisma.job.update({
    where: { id: "JOB-004" },
    data: { technicians: { connect: [{ id: "tech1" }] }, coTechnicians: { connect: [{ id: "tech2" }] } },
  });
  await prisma.job.update({
    where: { id: "JOB-005" },
    data: { technicians: { connect: [{ id: "tech2" }] } },
  });
  await prisma.job.update({
    where: { id: "JOB-008" },
    data: { technicians: { connect: [{ id: "tech3" }] } },
  });

  console.log('✅ Seeded jobs');

  // Seed Gas Stock
  await prisma.gasStockItem.createMany({
    data: [
      {
        id: "GS001",
        gasType: "R-410A",
        brand: "Honeywell",
        quantity: 25,
        remaining: 18.5,
        unit: "kg",
        supplier: "Coolgas SA",
        supplierRef: "INV-2024-0341",
        addedBy: "Alfred Motsi",
        date: "2024-10-15",
        notes: "25kg cylinder, Honeywell purple label",
      },
      {
        id: "GS002",
        gasType: "R-22",
        brand: "Chemours",
        quantity: 13.6,
        remaining: 6.2,
        unit: "kg",
        supplier: "Refrigerants Direct",
        supplierRef: "RD-88210",
        addedBy: "Alfred Motsi",
        date: "2024-09-01",
        notes: "R-22 phase-out stock — use cautiously",
      },
      {
        id: "GS003",
        gasType: "R-32",
        brand: "Daikin",
        quantity: 10,
        remaining: 10,
        unit: "kg",
        supplier: "Daikin SA",
        supplierRef: "DK-5501",
        addedBy: "Sipho Dlamini",
        date: "2024-11-20",
        notes: "New stock for inverter units",
      },
      {
        id: "GS004",
        gasType: "R-407C",
        brand: "Forane",
        quantity: 11.3,
        remaining: 4.0,
        unit: "kg",
        supplier: "Coolgas SA",
        supplierRef: "INV-2024-0412",
        addedBy: "Alfred Motsi",
        date: "2024-08-05",
        notes: "",
      },
    ],
  });

  console.log('✅ Seeded gas stock');

  // Seed Gas Usage
  await prisma.gasUsageRecord.createMany({
    data: [
      {
        id: "GU001",
        stockId: "GS001",
        gasType: "R-410A",
        quantityUsed: 3.5,
        usedBy: "tech1",
        jobId: "JOB-001",
        customer: "Sandton City Office Park",
        date: "2024-10-20",
        time: "10:30",
        purpose: "Top-up after leak repair",
      },
      {
        id: "GU002",
        stockId: "GS001",
        gasType: "R-410A",
        quantityUsed: 3.0,
        usedBy: "tech2",
        jobId: "JOB-002",
        customer: "Discovery Health Parktown",
        date: "2024-11-05",
        time: "14:15",
        purpose: "New installation charge",
      },
      {
        id: "GU003",
        stockId: "GS002",
        gasType: "R-22",
        quantityUsed: 4.2,
        usedBy: "tech3",
        jobId: "JOB-003",
        customer: "Woolworths Fourways",
        date: "2024-10-30",
        time: "09:00",
        purpose: "System recharge after compressor replacement",
      },
      {
        id: "GU004",
        stockId: "GS004",
        gasType: "R-407C",
        quantityUsed: 7.3,
        usedBy: "tech2",
        jobId: "JOB-005",
        customer: "Kyalami Estate HOA",
        date: "2024-11-18",
        time: "13:00",
        purpose: "Full system charge — new ducted unit",
      },
    ],
  });

  console.log('✅ Seeded gas usage');

  // Seed CRM Records
  await prisma.cRMRecord.createMany({
    data: [
      {
        id: "CRM001",
        customerId: "C001",
        type: CRMType.call,
        subject: "Annual contract renewal discussion",
        body: "Spoke with Priya about renewing the annual maintenance contract. She is happy with service. Agreed to send updated quote by end of week.",
        date: "2024-11-15",
        time: "10:30",
        by: "admin1",
        followUp: "2024-11-22",
        followUpDone: false,
        outcome: CRMOutcome.positive,
      },
      {
        id: "CRM002",
        customerId: "C004",
        type: CRMType.visit,
        subject: "Site assessment — server room cooling upgrade",
        body: "Visited Discovery Health for a full assessment of server room cooling. Identified 2 precision cooling units are end-of-life. Quote submitted.",
        date: "2024-10-28",
        time: "09:00",
        by: "tech1",
        followUp: "2024-11-28",
        followUpDone: false,
        outcome: CRMOutcome.positive,
      },
      {
        id: "CRM003",
        customerId: "C004",
        type: CRMType.complaint,
        subject: "Technician arrival time",
        body: "Themba arrived 2 hours late to the Discovery callout. Client lodged complaint. Apologised and offered priority scheduling. Resolved.",
        date: "2024-11-08",
        time: "16:00",
        by: "admin1",
        followUp: "",
        followUpDone: true,
        outcome: CRMOutcome.resolved,
      },
    ],
  });

  console.log('✅ Seeded CRM records');

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
