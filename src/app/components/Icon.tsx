'use client';

import React from 'react';
import {
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
  Menu,
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
  type LucideIcon,
} from 'lucide-react';

// Map Splash Air icon names to lucide-react icons
const iconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  calendar: Calendar,
  table: Table2,
  jobs: Table2,
  user: User,
  users: Users,
  container: Container,
  'container-services': Container,
  chart: BarChart3,
  'chart-line': BarChart3,
  flag: Flag,
  'flag-filled': Flag,
  add: Plus,
  close: X,
  checkmark: Check,
  edit: FileEdit,
  trash: Trash2,
  delete: Trash2,
  download: Download,
  print: Printer,
  search: Search,
  settings: Settings,
  phone: Phone,
  email: Mail,
  location: MapPin,
  time: Clock,
  whatsapp: MessageCircle,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'arrow-right': ArrowRight,
  menu: Menu,
  logout: LogOut,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
  help: HelpCircle,
  play: Play,
  stop: Square,
  pause: Pause,
  camera: Camera,
  document: FileText,
  copy: Copy,
  filter: Filter,
  sort: RefreshCw,
  refresh: RefreshCw,
  launch: ExternalLink,
  folder: Folder,
  license: FileBadge,
  certificate: Award,
  check: Check,
  checkbox: SquareIcon,
  'checkbox-checked': CheckSquare,
};

export type IconName = keyof typeof iconMap;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export function Icon({ name, size = 20, className, style, title }: IconProps) {
  const LucideIcon = iconMap[name];

  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found in lucide-react map`);
    return null;
  }

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      }}
      title={title}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      <LucideIcon size={size} />
    </span>
  );
}

// Quick access exports with friendly names
export const Icons = {
  dashboard: (props: Omit<IconProps, 'name'>) => <Icon name="dashboard" {...props} />,
  calendar: (props: Omit<IconProps, 'name'>) => <Icon name="calendar" {...props} />,
  jobs: (props: Omit<IconProps, 'name'>) => <Icon name="jobs" {...props} />,
  customers: (props: Omit<IconProps, 'name'>) => <Icon name="user" {...props} />,
  gasStock: (props: Omit<IconProps, 'name'>) => <Icon name="container" {...props} />,
  gasUsage: (props: Omit<IconProps, 'name'>) => <Icon name="chart" {...props} />,
  crm: (props: Omit<IconProps, 'name'>) => <Icon name="chart" {...props} />,
  odsReport: (props: Omit<IconProps, 'name'>) => <Icon name="license" {...props} />,
  users: (props: Omit<IconProps, 'name'>) => <Icon name="users" {...props} />,
  add: (props: Omit<IconProps, 'name'>) => <Icon name="add" {...props} />,
  close: (props: Omit<IconProps, 'name'>) => <Icon name="close" {...props} />,
  checkmark: (props: Omit<IconProps, 'name'>) => <Icon name="checkmark" {...props} />,
  check: (props: Omit<IconProps, 'name'>) => <Icon name="check" {...props} />,
  edit: (props: Omit<IconProps, 'name'>) => <Icon name="edit" {...props} />,
  delete: (props: Omit<IconProps, 'name'>) => <Icon name="delete" {...props} />,
  download: (props: Omit<IconProps, 'name'>) => <Icon name="download" {...props} />,
  print: (props: Omit<IconProps, 'name'>) => <Icon name="print" {...props} />,
  search: (props: Omit<IconProps, 'name'>) => <Icon name="search" {...props} />,
  settings: (props: Omit<IconProps, 'name'>) => <Icon name="settings" {...props} />,
  phone: (props: Omit<IconProps, 'name'>) => <Icon name="phone" {...props} />,
  email: (props: Omit<IconProps, 'name'>) => <Icon name="email" {...props} />,
  location: (props: Omit<IconProps, 'name'>) => <Icon name="location" {...props} />,
  time: (props: Omit<IconProps, 'name'>) => <Icon name="time" {...props} />,
  whatsapp: (props: Omit<IconProps, 'name'>) => <Icon name="whatsapp" {...props} />,
  chevronDown: (props: Omit<IconProps, 'name'>) => <Icon name="chevron-down" {...props} />,
  chevronUp: (props: Omit<IconProps, 'name'>) => <Icon name="chevron-up" {...props} />,
  chevronLeft: (props: Omit<IconProps, 'name'>) => <Icon name="chevron-left" {...props} />,
  chevronRight: (props: Omit<IconProps, 'name'>) => <Icon name="chevron-right" {...props} />,
  arrowRight: (props: Omit<IconProps, 'name'>) => <Icon name="arrow-right" {...props} />,
  menu: (props: Omit<IconProps, 'name'>) => <Icon name="menu" {...props} />,
  logout: (props: Omit<IconProps, 'name'>) => <Icon name="logout" {...props} />,
  warning: (props: Omit<IconProps, 'name'>) => <Icon name="warning" {...props} />,
  error: (props: Omit<IconProps, 'name'>) => <Icon name="error" {...props} />,
  info: (props: Omit<IconProps, 'name'>) => <Icon name="info" {...props} />,
  help: (props: Omit<IconProps, 'name'>) => <Icon name="help" {...props} />,
  play: (props: Omit<IconProps, 'name'>) => <Icon name="play" {...props} />,
  stop: (props: Omit<IconProps, 'name'>) => <Icon name="stop" {...props} />,
  pause: (props: Omit<IconProps, 'name'>) => <Icon name="pause" {...props} />,
  camera: (props: Omit<IconProps, 'name'>) => <Icon name="camera" {...props} />,
  document: (props: Omit<IconProps, 'name'>) => <Icon name="document" {...props} />,
  copy: (props: Omit<IconProps, 'name'>) => <Icon name="copy" {...props} />,
  filter: (props: Omit<IconProps, 'name'>) => <Icon name="filter" {...props} />,
  sort: (props: Omit<IconProps, 'name'>) => <Icon name="sort" {...props} />,
  refresh: (props: Omit<IconProps, 'name'>) => <Icon name="refresh" {...props} />,
  launch: (props: Omit<IconProps, 'name'>) => <Icon name="launch" {...props} />,
  folder: (props: Omit<IconProps, 'name'>) => <Icon name="folder" {...props} />,
  license: (props: Omit<IconProps, 'name'>) => <Icon name="license" {...props} />,
  certificate: (props: Omit<IconProps, 'name'>) => <Icon name="certificate" {...props} />,
  checkbox: (props: Omit<IconProps, 'name'>) => <Icon name="checkbox" {...props} />,
  checkboxChecked: (props: Omit<IconProps, 'name'>) => <Icon name="checkbox-checked" {...props} />,
};

export default Icon;
