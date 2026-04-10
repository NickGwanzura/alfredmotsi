# Carbon Migration Guide

## Quick Wins (1-2 Days)

### Step 1: Add Carbon Icons

Install the icon library:

```bash
npm install @carbon/icons-react
```

Create an icon mapping file:

```typescript
// lib/icons.ts
import {
  Dashboard,
  Calendar,
  Table,
  User,
  ContainerServices,
  DataEnrichment,
  ChartLine,
  FlagFilled,
  UserMultiple,
  Add,
  Close,
  Checkmark,
  Warning,
  ErrorFilled,
  Information,
  Settings,
  Search,
  Edit,
  TrashCan,
  Download,
  Printer,
  Phone,
  Email,
  Location,
  Time,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Menu,
  Logout,
} from '@carbon/icons-react';

export const Icons = {
  dashboard: Dashboard,
  calendar: Calendar,
  jobs: Table,
  customers: User,
  gasStock: ContainerServices,
  gasUsage: DataEnrichment,
  crm: ChartLine,
  odsReport: FlagFilled,
  users: UserMultiple,
  add: Add,
  close: Close,
  checkmark: Checkmark,
  warning: Warning,
  error: ErrorFilled,
  info: Information,
  settings: Settings,
  search: Search,
  edit: Edit,
  delete: TrashCan,
  download: Download,
  print: Printer,
  phone: Phone,
  email: Email,
  location: Location,
  time: Time,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  arrowRight: ArrowRight,
  menu: Menu,
  logout: Logout,
} as const;

export type IconName = keyof typeof Icons;
```

Create an Icon component:

```typescript
// components/Icon.tsx
import React from 'react';
import { Icons, IconName } from '@/app/lib/icons';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 20, className }: IconProps) {
  const IconComponent = Icons[name];
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  return <IconComponent size={size} className={className} />;
}
```

### Step 2: Update Navigation Icons

Replace unicode symbols in `page.tsx`:

```typescript
// Before
{ id: "home", label: "Dashboard", icon: "⊞" },

// After
import { Icon } from '@/app/components/Icon';

{ id: "home", label: "Dashboard", icon: <Icon name="dashboard" size={16} /> },
```

### Step 3: Add TypeScript Types for Carbon Colors

```typescript
// types/carbon.ts
export type CarbonColor =
  | 'blue' | 'cool-gray' | 'cyan' | 'green' | 'magenta' | 'orange' | 'purple' | 'red' | 'teal' | 'warm-gray'
  | 'blue10' | 'blue20' | 'blue30' | 'blue40' | 'blue50' | 'blue60' | 'blue70' | 'blue80' | 'blue90' | 'blue100'
  | 'green10' | 'green20' | 'green30' | 'green40' | 'green50' | 'green60' | 'green70' | 'green80' | 'green90' | 'green100'
  | 'gray10' | 'gray20' | 'gray30' | 'gray40' | 'gray50' | 'gray60' | 'gray70' | 'gray80' | 'gray90' | 'gray100';

export type TagType = 
  | 'blue' | 'cool-gray' | 'cyan' | 'green' | 'magenta' 
  | 'orange' | 'purple' | 'red' | 'teal' | 'warm-gray'
  | 'high-contrast' | 'outline';
```

---

## Medium Improvements (1 Week)

### Step 4: Enhance Status Tags

Update the `StatusTag` component:

```typescript
// components/ui.tsx
import React from 'react';
import { Icon } from './Icon';
import { JobStatus, JobPriority, AlertType, CRMOutcome } from '@/app/types';
import { STATUS_CFG, PRIO_TAG, ALERT_CFG } from '@/app/lib/config';

// Enhanced StatusTag with proper icons
const statusIcons: Record<JobStatus, string> = {
  scheduled: 'calendar',
  'in-progress': 'time',
  'on-site': 'location',
  completed: 'checkmark',
  cancelled: 'close',
  'pending-parts': 'warning',
  unallocated: 'warning',
  'pending-booking': 'time',
};

export function StatusTag({ status }: { status: JobStatus }) {
  const config = STATUS_CFG[status];
  const iconName = statusIcons[status];
  
  return (
    <span 
      className="tag" 
      style={{ 
        background: config.bg, 
        color: config.txt,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px'
      }}
    >
      {iconName && <Icon name={iconName as any} size={14} />}
      {config.label}
    </span>
  );
}
```

### Step 5: Add Loading States

Create loading components:

```typescript
// components/Loading.tsx
import React from 'react';

export function LoadingSpinner({ size = 48 }: { size?: number }) {
  return (
    <div 
      className="loading-spinner"
      style={{
        width: size,
        height: size,
        border: `3px solid var(--l3)`,
        borderTopColor: 'var(--bi)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  );
}

export function SkeletonText({ width = '100%' }: { width?: string }) {
  return (
    <div 
      className="skeleton"
      style={{
        width,
        height: '1em',
        background: 'linear-gradient(90deg, var(--l3) 25%, var(--lh1) 50%, var(--l3) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="tile" style={{ padding: 'var(--s5)' }}>
      <SkeletonText width="60%" />
      <div style={{ marginTop: 'var(--s3)' }}>
        <SkeletonText width="100%" />
      </div>
    </div>
  );
}
```

Add animations to globals.css:

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Step 6: Add Empty States

```typescript
// components/EmptyState.tsx
import React from 'react';
import { Icon, IconName } from './Icon';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--s9) var(--s5)',
        textAlign: 'center',
      }}
    >
      {icon && (
        <div style={{ marginBottom: 'var(--s4)' }}>
          <Icon name={icon} size={48} />
        </div>
      )}
      <h3 style={{ 
        fontSize: '16px', 
        fontWeight: 600, 
        color: 'var(--tp)',
        marginBottom: 'var(--s2)'
      }}>
        {title}
      </h3>
      {description && (
        <p style={{ 
          fontSize: '14px', 
          color: 'var(--ts)',
          marginBottom: 'var(--s4)'
        }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
```

---

## Advanced Improvements (2-4 Weeks)

### Step 7: Install Carbon Styles Package

```bash
npm install @carbon/styles
```

Update your CSS imports:

```css
/* globals.css - Add at top */
@use '@carbon/styles/scss/themes';
@use '@carbon/styles/scss/theme' with (
  $theme: themes.$g10
);
@use '@carbon/styles/scss/components/button';
@use '@carbon/styles/scss/components/tag';
```

### Step 8: Create Carbon-Themed Components

Wrap your custom components with Carbon classes:

```typescript
// components/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isExpressive?: boolean;
  renderIcon?: React.ComponentType<any>;
}

export function Button({ 
  children, 
  kind = 'primary', 
  size = 'md',
  isExpressive,
  renderIcon: Icon,
  className,
  ...props 
}: ButtonProps) {
  const sizeClasses = {
    sm: 'cds--btn--sm',
    md: '',
    lg: 'cds--btn--lg',
    xl: 'cds--btn--xl',
  };
  
  const kindClasses = {
    primary: 'cds--btn--primary',
    secondary: 'cds--btn--secondary',
    tertiary: 'cds--btn--tertiary',
    ghost: 'cds--btn--ghost',
    danger: 'cds--btn--danger',
  };

  return (
    <button
      className={[
        'cds--btn',
        kindClasses[kind],
        sizeClasses[size],
        isExpressive && 'cds--btn--expressive',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
      {Icon && <Icon className="cds--btn__icon" />}
    </button>
  );
}
```

### Step 9: Add Data Table Features

Enhance the JobsTable with sorting:

```typescript
// hooks/useSortableData.ts
import { useState, useMemo } from 'react';

export function useSortableData<T>(items: T[], config: { key: keyof T; direction: 'asc' | 'desc' } | null = null) {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    const sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key: keyof T) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
}
```

---

## Full Carbon Migration (6-8 Weeks)

### Phase 1: Foundation (Week 1-2)

1. Install @carbon/react
2. Set up Carbon provider
3. Configure theme (G10 for light mode)
4. Update global styles

### Phase 2: Core Components (Week 3-4)

Replace in order:
1. Buttons → Button
2. Tags → Tag
3. Inputs → TextInput, Dropdown, DatePicker
4. Modals → Modal, ComposedModal
5. Tables → DataTable

### Phase 3: Navigation (Week 5)

1. Header → UI Shell Header
2. SideNav → UI Shell SideNav
3. Add breadcrumbs

### Phase 4: Forms (Week 6)

1. Form validation with Carbon patterns
2. File uploads
3. Complex form layouts

### Phase 5: Polish (Week 7-8)

1. Loading states
2. Empty states
3. Error boundaries
4. Accessibility audit
5. Performance optimization

---

## Migration Checklist

### Before Migration

- [ ] Audit current component usage
- [ ] Identify custom component requirements
- [ ] Plan theme customization
- [ ] Set up testing environment
- [ ] Create component mapping document

### During Migration

- [ ] Install @carbon/react
- [ ] Set up SCSS compilation
- [ ] Migrate icons
- [ ] Migrate buttons
- [ ] Migrate forms
- [ ] Migrate tables
- [ ] Migrate modals
- [ ] Migrate navigation
- [ ] Add loading states
- [ ] Add empty states
- [ ] Update tests

### After Migration

- [ ] Accessibility audit
- [ ] Cross-browser testing
- [ ] Mobile responsiveness check
- [ ] Performance benchmarking
- [ ] Update documentation
- [ ] Team training

---

## Common Pitfalls

### 1. Breaking Changes

```typescript
// Carbon components have specific prop names
<Button kind="primary" size="sm">  // ✅ Correct
<Button variant="primary" small>   // ❌ Wrong
```

### 2. Theme Configuration

```scss
// Must configure theme BEFORE importing components
@use '@carbon/styles/scss/theme' with ($theme: themes.$g10);
@use '@carbon/styles/scss/components/button';  // ✅ After theme
```

### 3. Icon Sizes

```typescript
// Carbon icons need explicit size
<Dashboard size={16} />  // ✅
<Dashboard />             // ❌ May not render correctly
```

### 4. Event Handling

```typescript
// Carbon uses native events
<Button onClick={handleClick}>      // ✅
<Button onPress={handlePress}>      // ❌
```

---

## Resources

- [Carbon React Storybook](https://react.carbondesignsystem.com/)
- [Migration Guide](https://carbondesignsystem.com/migrating/overview/)
- [Component API Docs](https://react.carbondesignsystem.com/?path=/docs/getting-started--page)
- [Theming Guide](https://carbondesignsystem.com/guidelines/themes/overview/)
