/**
 * Components Index
 * 
 * Central export for all UI components
 */

// ============================================
// CARBON ICONS (Re-export for convenience)
// ============================================

export {
  // Navigation
  Dashboard,
  Calendar,
  Table,
  User,
  ContainerServices,
  ChartLine,
  FlagFilled,
  UserMultiple,
  
  // Actions
  Add,
  Close,
  Checkmark,
  Edit,
  TrashCan,
  Download,
  Printer,
  Search,
  Settings,
  
  // Communication
  Phone,
  Email,
  Location,
  Time,
  
  // Arrows
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  
  // Status
  Warning,
  WarningFilled,
  ErrorFilled,
  CheckmarkFilled,
  Information,
  Help,
  
  // Media
  PlayFilled,
  StopFilled,
  Pause,
  Camera,
  
  // File
  Document,
  Copy,
  
  // Misc
  Filter,
  Fade,
  Restart,
  Launch,
  Folder,
  License,
  Certificate,
  CheckmarkOutline,
  Checkbox,
  CheckboxChecked,
  Logout,
} from '@carbon/icons-react';

// ============================================
// LEGACY UI COMPONENTS
// ============================================

export {
  StatusTag,
  PrioTag,
  Avatar,
  SectionTitle,
  Notification,
  FormItem,
  AlertTag,
  CRMOutcomeTag,
} from './ui';

// ============================================
// PAGE COMPONENTS
// ============================================

export { default as AdminDashboard } from './AdminDashboard';
export { default as CalendarView } from './CalendarView';
export { default as JobsTable } from './JobsTable';
export { default as CustomerDB } from './CustomerDB';
export { default as GasStock } from './GasStock';
export { default as GasUsage } from './GasUsage';
export { default as CRM } from './CRM';
export { default as ODSReport } from './ODSReport';
export { default as UserManagement } from './UserManagement';
export { default as Login } from './Login';
export { default as AddJobModal } from './AddJobModal';
export { default as JobCardModal } from './JobCardModal';
export { default as JobCardPrint } from './JobCardPrint';
export { default as SignaturePad } from './SignaturePad';

// ============================================
// CUSTOM COMPONENTS
// ============================================

export {
  Button,
  PrimaryButton,
  SecondaryButton,
  TertiaryButton,
  GhostButton,
  DangerButton,
  type ButtonKind,
  type ButtonSize,
  type ButtonProps,
} from './Button';

export {
  Icon,
  Icons,
  type IconName,
} from './Icon';
