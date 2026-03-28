import { User, Customer, Job, GasStockItem, GasUsageRecord, CRMRecord } from '@/app/types';

export const ADMIN_EMAIL = "alfred@splashair.co.za";

export const SEED_USERS: User[] = [
  { id: "admin1", name: "Alfred Motsi", role: "admin", email: ADMIN_EMAIL, pin: "1234", phone: "011 000 0001" },
  { id: "tech1", name: "Sipho Dlamini", role: "tech", email: "sipho@splashair.co.za", pin: "0001", phone: "071 234 5678", specialty: "Installation", status: "available" },
  { id: "tech2", name: "Themba Nkosi", role: "tech", email: "themba@splashair.co.za", pin: "0002", phone: "082 345 6789", specialty: "Maintenance", status: "on-site" },
  { id: "tech3", name: "Lerato Sithole", role: "tech", email: "lerato@splashair.co.za", pin: "0003", phone: "060 456 7890", specialty: "Repairs", status: "in-transit" },
];

export const SEED_CUSTOMERS: Customer[] = [
  { id: "C001", name: "Sandton City Office Park", address: "5 Alice Lane, Sandton, JHB", siteAddress: "5 Alice Lane, Sandton, JHB", phone: "011 881 2000", whatsapp: "27118812000", email: "facilities@sandtoncity.co.za", portalCode: "SC2024", portalEnabled: true },
  { id: "C002", name: "Rosebank Mall Administration", address: "50 Bath Avenue, Rosebank, JHB", siteAddress: "50 Bath Avenue, Rosebank, JHB", phone: "011 788 1400", whatsapp: "27117881400", email: "ops@rosebankmall.co.za", portalCode: "RM2024", portalEnabled: true },
  { id: "C003", name: "Woolworths Fourways", address: "Cnr William Nicol & Witkoppen, Fourways", siteAddress: "Cnr William Nicol & Witkoppen, Fourways", phone: "011 465 5100", whatsapp: "27114655100", email: "fm@woolworths.co.za", portalCode: "WW2024", portalEnabled: false },
  { id: "C004", name: "Discovery Health Parktown", address: "1 Discovery Place, Sandton, JHB", siteAddress: "1 Discovery Place, Sandton, JHB", phone: "011 529 2888", whatsapp: "27115292888", email: "facilities@discovery.co.za", portalCode: "DH2024", portalEnabled: true },
  { id: "C005", name: "Kyalami Estate HOA", address: "Kyalami Estate, Midrand", siteAddress: "Kyalami Estate, Midrand", phone: "011 466 7700", whatsapp: "27114667700", email: "admin@kyalami.co.za", portalCode: "KY2024", portalEnabled: true },
];

const today = new Date();
const ds = (offset: number, h: number, m = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return { 
    date: d.toISOString().split("T")[0], 
    time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` 
  };
};

export const SEED_GAS_STOCK: GasStockItem[] = [
  { id: "GS001", gasType: "R-410A", brand: "Honeywell", quantity: 25, remaining: 18.5, unit: "kg", supplier: "Coolgas SA", supplierRef: "INV-2024-0341", addedBy: "Alfred Motsi", date: "2024-10-15", notes: "25kg cylinder, Honeywell purple label" },
  { id: "GS002", gasType: "R-22", brand: "Chemours", quantity: 13.6, remaining: 6.2, unit: "kg", supplier: "Refrigerants Direct", supplierRef: "RD-88210", addedBy: "Alfred Motsi", date: "2024-09-01", notes: "R-22 phase-out stock — use cautiously" },
  { id: "GS003", gasType: "R-32", brand: "Daikin", quantity: 10, remaining: 10, unit: "kg", supplier: "Daikin SA", supplierRef: "DK-5501", addedBy: "Sipho Dlamini", date: "2024-11-20", notes: "New stock for inverter units" },
  { id: "GS004", gasType: "R-407C", brand: "Forane", quantity: 11.3, remaining: 4.0, unit: "kg", supplier: "Coolgas SA", supplierRef: "INV-2024-0412", addedBy: "Alfred Motsi", date: "2024-08-05", notes: "" },
];

export const SEED_GAS_USAGE: GasUsageRecord[] = [
  { id: "GU001", stockId: "GS001", gasType: "R-410A", quantityUsed: 3.5, usedBy: "Sipho Dlamini", jobId: "JOB-001", customer: "Sandton City Office Park", date: "2024-10-20", time: "10:30", purpose: "Top-up after leak repair" },
  { id: "GU002", stockId: "GS001", gasType: "R-410A", quantityUsed: 3.0, usedBy: "Themba Nkosi", jobId: "JOB-002", customer: "Discovery Health Parktown", date: "2024-11-05", time: "14:15", purpose: "New installation charge" },
  { id: "GU003", stockId: "GS002", gasType: "R-22", quantityUsed: 4.2, usedBy: "Lerato Sithole", jobId: "JOB-003", customer: "Woolworths Fourways", date: "2024-10-30", time: "09:00", purpose: "System recharge after compressor replacement" },
  { id: "GU004", stockId: "GS004", gasType: "R-407C", quantityUsed: 7.3, usedBy: "Themba Nkosi", jobId: "JOB-005", customer: "Kyalami Estate HOA", date: "2024-11-18", time: "13:00", purpose: "Full system charge — new ducted unit" },
];

export const SEED_CRM: CRMRecord[] = [
  { id: "CRM001", customerId: "C001", type: "call", subject: "Annual contract renewal discussion", body: "Spoke with Priya about renewing the annual maintenance contract. She is happy with service. Agreed to send updated quote by end of week.", date: "2024-11-15", time: "10:30", by: "Alfred Motsi", followUp: "2024-11-22", followUpDone: false, outcome: "positive" },
  { id: "CRM002", customerId: "C004", type: "visit", subject: "Site assessment — server room cooling upgrade", body: "Visited Discovery Health for a full assessment of server room cooling. Identified 2 precision cooling units are end-of-life. Quote submitted.", date: "2024-10-28", time: "09:00", by: "Sipho Dlamini", followUp: "2024-11-28", followUpDone: false, outcome: "positive" },
  { id: "CRM003", customerId: "C004", type: "complaint", subject: "Technician arrival time", body: "Themba arrived 2 hours late to the Discovery callout. Client lodged complaint. Apologised and offered priority scheduling. Resolved.", date: "2024-11-08", time: "16:00", by: "Alfred Motsi", followUp: "", followUpDone: true, outcome: "resolved" },
];

export const SEED_JOBS: Job[] = [
  { 
    id: "JOB-001", source: "admin", customerId: "C001", title: "Boardroom Unit Installation", type: "installation", unitType: "Split System", issue: "install", priority: "high",
    ...ds(0, 8), techIds: ["tech1"], coTechIds: [], status: "in-progress", clockIn: "08:05", clockOut: null,
    description: "Install 2x Samsung 18000 BTU splits in boardrooms A and B.",
    diagnostics: null, photos: [], signature: null, jobCardRef: "JC-001", alerts: [], recurring: null, comments: [], history: []
  },
  { 
    id: "JOB-002", source: "admin", customerId: "C002", title: "Annual Service — 6 Ducted Units", type: "maintenance", unitType: "Ducted", issue: "service", priority: "medium",
    ...ds(0, 10, 30), techIds: ["tech2"], coTechIds: [], status: "on-site", clockIn: "10:45", clockOut: null,
    description: "Annual service of 6 ducted units in admin wing.",
    diagnostics: { voltage: "232", current: "14.2", avgTemp: "22", maxTemp: "40", suction: "68", discharge: "245", refrigerantType: "R-410A", refrigerantRecovered: 0.5, refrigerantUsed: 1.2, refrigerantReused: 0.3, status: "optimal", notes: "All units running normally.", deltaT: "11" },
    photos: ["before_unit1.jpg"], signature: null, jobCardRef: "JC-002", alerts: [], recurring: { interval: 6, unit: "months" }, comments: [{ author: "Themba Nkosi", text: "3 of 6 done.", time: "11:20" }], history: []
  },
  { 
    id: "JOB-003", source: "admin", customerId: "C003", title: "Emergency Compressor Repair", type: "repair", unitType: "Split System", issue: "repair", priority: "urgent",
    ...ds(-1, 14), techIds: ["tech3"], coTechIds: [], status: "completed", clockIn: "14:10", clockOut: "15:45",
    description: "Unit tripping breaker. Inspect compressor and electrical.",
    diagnostics: { voltage: "228", current: "18.9", avgTemp: "24", maxTemp: "40", suction: "55", discharge: "290", refrigerantType: "R-32", refrigerantRecovered: 1.1, refrigerantUsed: 0, refrigerantReused: 0.8, status: "optimal", notes: "Faulty capacitor replaced. Unit running well.", deltaT: "13" },
    photos: ["before.jpg", "after.jpg"], signature: "Customer signed", jobCardRef: "JC-003", alerts: [], recurring: null, comments: [], history: [{ date: ds(-90, 14).date, note: "Previous repair — fan motor." }]
  },
  { 
    id: "JOB-004", source: "admin", customerId: "C005", title: "Sales Quote — 10 Unit Install", type: "sales", unitType: "Multi-Head", issue: "quote", priority: "medium",
    ...ds(2, 9), techIds: ["tech1"], coTechIds: ["tech2"], status: "scheduled", clockIn: null, clockOut: null,
    description: "Site visit for 10-unit installation quote.",
    diagnostics: null, photos: [], signature: null, jobCardRef: "JC-004", alerts: [], recurring: null, comments: [], history: []
  },
  { 
    id: "JOB-005", source: "admin", customerId: "C004", title: "HEPA Filter Replacement", type: "maintenance", unitType: "Ducted", issue: "service", priority: "low",
    ...ds(3, 7), techIds: ["tech2"], coTechIds: [], status: "scheduled", clockIn: null, clockOut: null,
    description: "Replace HEPA filters in 4 units on floor 3.",
    diagnostics: null, photos: [], signature: null, jobCardRef: "JC-005", alerts: [], recurring: { interval: 3, unit: "months" }, comments: [], history: []
  },
  { 
    id: "JOB-006", source: "admin", customerId: "C001", title: "Cold Room Refrigeration Service", type: "maintenance", unitType: "Refrigeration System", issue: "service", priority: "medium",
    ...ds(5, 9), techIds: [], coTechIds: [], status: "unallocated", clockIn: null, clockOut: null,
    description: "Full service on walk-in cold room refrigeration units. ODS check required.",
    diagnostics: null, photos: [], signature: null, jobCardRef: "JC-006", alerts: [], recurring: null, comments: [], history: []
  },
  { 
    id: "JOB-007", source: "admin", customerId: "C003", title: "AC Installation — New Fourways Branch", type: "installation", unitType: "Cassette", issue: "install", priority: "high",
    ...ds(7, 8), techIds: [], coTechIds: [], status: "unallocated", clockIn: null, clockOut: null,
    description: "Install 4 cassette units in new branch.",
    diagnostics: null, photos: [], signature: null, jobCardRef: "JC-007", alerts: [], recurring: null, comments: [], history: []
  },
  { 
    id: "JOB-008", source: "admin", customerId: "C004", title: "R-22 Recovery & Retrofit", type: "repair", unitType: "Ducted", issue: "repair", priority: "high",
    ...ds(-3, 9), techIds: ["tech3"], coTechIds: [], status: "completed", clockIn: "09:00", clockOut: "13:30",
    description: "Recover R-22 from old system and retrofit to R-407C.",
    diagnostics: { voltage: "225", current: "12.1", avgTemp: "20", maxTemp: "38", suction: "60", discharge: "220", refrigerantType: "R-22", refrigerantRecovered: 2.4, refrigerantUsed: 0, refrigerantReused: 0, status: "optimal", notes: "Full R-22 recovery completed. System retrofitted to R-407C. Old refrigerant sent to licensed recovery facility.", deltaT: "10" },
    photos: ["r22_recovery.jpg"], signature: "Customer signed", jobCardRef: "JC-008", alerts: [], recurring: null, comments: [], history: []
  },
];
