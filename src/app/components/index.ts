/**
 * Components Index
 * 
 * Central export for all UI components
 */

// ============================================
// LUCIDE ICONS (Re-export for convenience)
// ============================================

export {
  LayoutDashboard,
  Calendar,
  Table2,
  User,
  Users,
  Container,
  BarChart3,
  Flag,
  Plus,
  X,
  Check,
  FileEdit,
  Trash2,
  Download,
  Printer,
  Search,
  Settings,
  Phone,
  Mail,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  LogOut,
  AlertTriangle,
  AlertCircle,
  Info,
  HelpCircle,
  Play,
  Square,
  Pause,
  Camera,
  FileText,
  Copy,
  Filter,
  RefreshCw,
  ExternalLink,
  Folder,
  FileBadge,
  Award,
  CheckSquare,
  Square as SquareIcon,
  MessageCircle,
} from 'lucide-react';

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
