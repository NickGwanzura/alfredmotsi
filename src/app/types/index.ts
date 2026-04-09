export type UserRole = 'admin' | 'tech' | 'client';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone?: string;
  specialty?: string;
  status?: TechStatus;
  image?: string;
}

export type TechStatus = 'available' | 'on-site' | 'in-transit';

export interface Customer {
  id: string;
  name: string;
  address: string;
  siteAddress?: string;
  phone: string;
  whatsapp?: string;
  email: string;
  portalCode: string;
  portalEnabled: boolean;
}

export type JobType = 'installation' | 'maintenance' | 'repair' | 'sales' | 'inspection' | 'callout';
export type JobStatus = 'scheduled' | 'in-progress' | 'on-site' | 'completed' | 'cancelled' | 'pending-parts' | 'unallocated' | 'pending-booking';
export type JobPriority = 'urgent' | 'high' | 'medium' | 'low';
export type IssueType = 'install' | 'repair' | 'service' | 'quote';
export type UnitType = 'Split System' | 'Ducted' | 'Package Unit' | 'Multi-Head' | 'Cassette' | 'VRV/VRF' | 'Refrigeration System' | 'Chiller' | 'Heat Pump' | 'Precision Cooling';
export type RefrigerantType = 'R-32' | 'R-410A' | 'R-22' | 'R-134a' | 'R-407C' | 'R-600A' | 'R-290';
export type SystemStatus = 'optimal' | 'sub-optimal' | 'critical';
export type AlertType = 'HIGH_CURRENT' | 'LOW_VOLTAGE' | 'HIGH_TEMP' | 'PRESSURE_LEAK';
export type JobSource = 'admin' | 'portal';

export interface Diagnostics {
  voltage?: string;
  current?: string;
  avgTemp?: string;
  maxTemp?: string;
  suction?: string;
  discharge?: string;
  refrigerantType?: RefrigerantType | string;
  refrigerantRecovered?: number;
  refrigerantUsed?: number;
  refrigerantReused?: number;
  status?: SystemStatus;
  notes?: string;
  deltaT?: string;
  brand?: string;
  serial?: string;
  unitType?: UnitType;
}

export interface RecurringSchedule {
  interval: number;
  unit: 'months';
}

export interface Comment {
  author: string;
  text: string;
  time: string;
}

export interface HistoryEntry {
  date: string;
  note: string;
}

export interface Job {
  id: string;
  source: JobSource;
  customerId: string;
  title: string;
  type: JobType;
  unitType: UnitType;
  issue: IssueType;
  priority: JobPriority;
  date: string;
  time: string;
  techIds: string[];
  coTechIds: string[];
  status: JobStatus;
  clockIn: string | null;
  clockOut: string | null;
  description: string;
  diagnostics: Diagnostics | null;
  photos: string[];
  signature: string | null;
  jobCardRef: string;
  alerts: AlertType[];
  recurring: RecurringSchedule | null;
  comments: Comment[];
  history: HistoryEntry[];
}

export interface GasStockItem {
  id: string;
  gasType: string;
  brand: string;
  quantity: number;
  remaining: number;
  unit: string;
  supplier: string;
  supplierRef: string;
  addedBy: string;
  date: string;
  notes: string;
}

export interface GasUsageRecord {
  id: string;
  stockId: string;
  gasType: string;
  quantityUsed: number;
  usedBy: string;
  jobId: string;
  customer: string;
  date: string;
  time: string;
  purpose: string;
}

export type CRMType = 'call' | 'visit' | 'complaint' | 'email' | 'quote';
export type CRMOutcome = 'positive' | 'negative' | 'pending' | 'resolved';

export interface CRMRecord {
  id: string;
  customerId: string;
  type: CRMType;
  subject: string;
  body: string;
  date: string;
  time: string;
  by: string;
  followUp: string;
  followUpDone: boolean;
  outcome: CRMOutcome;
}

export interface StatusConfig {
  label: string;
  bg: string;
  txt: string;
}

export interface TypeConfig {
  label: string;
  icon: string;
  color: string;
}

export interface TechStatusConfig {
  color: string;
  label: string;
}

export interface AlertConfig {
  label: string;
  color: string;
  icon: string;
}

export interface PriorityTagConfig {
  bg: string;
  txt: string;
}

export type PageId = 'home' | 'calendar' | 'jobs' | 'customers' | 'gas-stock' | 'gas-usage' | 'crm' | 'ods-report' | 'users';

export interface NavItem {
  id: PageId;
  label: string;
  icon: string;
}
