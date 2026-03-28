import { StatusConfig, TypeConfig, TechStatusConfig, AlertConfig, PriorityTagConfig, JobStatus, JobType, TechStatus, AlertType, JobPriority } from '@/app/types';

export const STATUS_CFG: Record<JobStatus, StatusConfig> = {
  scheduled: { label: "Scheduled", bg: "#cfe2ff", txt: "#084298" },
  "in-progress": { label: "In Progress", bg: "#d1ecf1", txt: "#0c5460" },
  "on-site": { label: "On Site", bg: "#fff3cd", txt: "#664d03" },
  completed: { label: "Completed", bg: "#d4edda", txt: "#155724" },
  cancelled: { label: "Cancelled", bg: "#e2e3e5", txt: "#383d41" },
  "pending-parts": { label: "Pending Parts", bg: "#e8d5f5", txt: "#4b1d8b" },
  unallocated: { label: "Unallocated", bg: "#fff3cd", txt: "#664d03" },
  "pending-booking": { label: "Pending Booking", bg: "#fde8e0", txt: "#7d2c12" },
};

export const TYPE_CFG: Record<JobType, TypeConfig> = {
  installation: { label: "Installation", icon: "⚙", color: "#4589ff" },
  maintenance: { label: "Maintenance", icon: "⬡", color: "#42be65" },
  repair: { label: "Repair", icon: "△", color: "#ff832b" },
  sales: { label: "Sales", icon: "◈", color: "#be95ff" },
  inspection: { label: "Inspection", icon: "◎", color: "#78a9ff" },
  callout: { label: "Callout", icon: "⚑", color: "#ff8389" },
};

export const TECH_STATUS: Record<TechStatus, TechStatusConfig> = {
  available: { color: "var(--ss)", label: "Available" },
  "on-site": { color: "var(--sw)", label: "On Site" },
  "in-transit": { color: "var(--si)", label: "In Transit" },
};

export const ALERT_CFG: Record<AlertType, AlertConfig> = {
  HIGH_CURRENT: { label: "High Current", color: "var(--se)", icon: "⚡" },
  LOW_VOLTAGE: { label: "Low Voltage", color: "var(--sw)", icon: "⬇" },
  HIGH_TEMP: { label: "Overtemperature", color: "var(--sw)", icon: "⬆" },
  PRESSURE_LEAK: { label: "Pressure Anomaly", color: "var(--se)", icon: "●" },
};

export const PRIO_TAG: Record<JobPriority, PriorityTagConfig> = {
  urgent: { bg: "#f8d7da", txt: "#842029" },
  high: { bg: "#fde8e0", txt: "#7d2c12" },
  medium: { bg: "#fff3cd", txt: "#664d03" },
  low: { bg: "#d4edda", txt: "#155724" },
};

export const UNIT_TYPES = ["Split System", "Ducted", "Package Unit", "Multi-Head", "Cassette", "VRV/VRF", "Refrigeration System", "Chiller", "Heat Pump", "Precision Cooling"];

export const REFRIGERANT_TYPES = ["R-32", "R-410A", "R-22", "R-134a", "R-407C", "R-600A", "R-290"];
