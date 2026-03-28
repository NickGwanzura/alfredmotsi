import { Diagnostics, AlertType, Job, Customer } from '@/app/types';
import { ALERT_CFG } from './config';

export const pad = (n: number) => String(n).padStart(2, "0");

export const fmtDate = (d: string) => 
  new Date(d + "T12:00").toLocaleDateString("en-ZA", { 
    weekday: "short", 
    day: "numeric", 
    month: "short", 
    year: "numeric" 
  });

export const nowTime = () => { 
  const n = new Date(); 
  return `${pad(n.getHours())}:${pad(n.getMinutes())}`; 
};

export const initials = (name: string) => 
  name.split(" ").map(n => n[0]).join("");

export const newId = () => "JOB-" + String(Date.now()).slice(-5);

export function runAlerts(diag: Diagnostics | null): AlertType[] {
  const a: AlertType[] = [];
  if (!diag) return a;
  if (parseFloat(diag.current || "0") > 16) a.push("HIGH_CURRENT");
  if (parseFloat(diag.voltage || "0") < 210) a.push("LOW_VOLTAGE");
  if (parseFloat(diag.avgTemp || "0") > parseFloat(diag.maxTemp || "0")) a.push("HIGH_TEMP");
  if (parseFloat(diag.suction || "0") < 50 || parseFloat(diag.discharge || "0") > 300) a.push("PRESSURE_LEAK");
  return a;
}

export function hasConflict(
  jobs: Job[], 
  techId: string, 
  date: string, 
  time: string, 
  excludeId: string | null = null
): boolean {
  const slot = new Date(`${date}T${time}`);
  return jobs
    .filter(j => 
      j.id !== excludeId && 
      j.techIds.includes(techId) && 
      j.date === date && 
      j.status !== "cancelled" && 
      j.status !== "completed"
    )
    .some(j => { 
      const s = new Date(`${j.date}T${j.time}`); 
      return slot >= s && slot < new Date(s.getTime() + 150 * 60000); 
    });
}

export const formatDuration = (clockIn: string | null, clockOut: string | null): string | null => {
  if (!clockIn || !clockOut) return null;
  const [ih, im] = clockIn.split(":").map(Number);
  const [oh, om] = clockOut.split(":").map(Number);
  const mn = (oh * 60 + om) - (ih * 60 + im);
  return `${Math.floor(mn / 60)}h ${mn % 60}m`;
};

// WhatsApp link generation
export const buildWA = (phone: string, msg: string): string => {
  const c = phone.replace(/[\s\-\+()]/g, "");
  const n = c.startsWith("0") ? "27" + c.slice(1) : c;
  return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
};

// Email link generation
export const buildMail = (email: string, subject: string, body: string): string => {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

// Reminder message generation
export const reminderMsg = (job: Job, cust: Customer | undefined, isAdmin = false): string => {
  const d = fmtDate(job.date);
  if (isAdmin) {
    return `SPLASH AIR — NEW JOB SCHEDULED\n\nJob: ${job.title}\nCustomer: ${cust?.name}\nAddress: ${cust?.address}\nDate: ${d} at ${job.time}\nType: ${job.type}\nUnit: ${job.unitType}\nPriority: ${job.priority}\nJob ID: ${job.id}`;
  }
  return `Dear ${cust?.name},\n\nThis is a reminder from Splash Air Conditioning.\n\nYour ${job.type} appointment is confirmed:\nDate: ${d}\nTime: ${job.time}\nService: ${job.title}\nAddress: ${cust?.address}\n\nPlease ensure access is available.\n\nFor queries call 011 000 0001.\n\nThank you,\nSplash Air Conditioning`;
};

// Portal invite message
export const portalInviteText = (cust: Customer): string => {
  return `Dear ${cust.name},\n\nYou have been invited to the Splash Air Client Portal.\n\nYour portal access code: ${cust.portalCode}\nYour login email: ${cust.email}\n\nWith your portal you can:\n- View all your service history\n- Track live job progress\n- Book new service requests\n- Download Works Done Reports\n\nSelect Client Portal on the login screen and enter your email and code.\n\nFor support call 011 000 0001.\n\nSplash Air Conditioning`;
};

// Generate random portal code
export const genCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Generate new customer ID
export const newCId = (): string => {
  return "C" + String(Date.now()).slice(-5);
};
