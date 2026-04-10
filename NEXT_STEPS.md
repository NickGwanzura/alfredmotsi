# Carbon Integration - Next Steps

✅ **Completed:** Carbon packages installed  
🚀 **Next:** Follow this roadmap to complete integration

---

## PHASE 1: Setup (15 minutes)

### Step 1: Update globals.css with Carbon Styles

Replace the top of your `globals.css`:

```scss
/* Import Carbon font */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

/* Carbon Design System Theme */
@use '@carbon/styles/scss/config' with (
  $font-path: '@ibm/plex'
);

@use '@carbon/styles/scss/themes';
@use '@carbon/styles/scss/theme' with (
  $theme: themes.$g10  // Light theme
);

/* Import Carbon components you need */
@use '@carbon/styles/scss/components/button';
@use '@carbon/styles/scss/components/data-table';
@use '@carbon/styles/scss/components/modal';
@use '@carbon/styles/scss/components/tabs';
@use '@carbon/styles/scss/components/tag';
@use '@carbon/styles/scss/components/notification';
@use '@carbon/styles/scss/components/text-input';
@use '@carbon/styles/scss/components/dropdown';

/* Your existing custom styles below... */
```

### Step 2: Test Carbon Components Work

Create a test page at `app/carbon-test/page.tsx`:

```tsx
'use client';

import { Button, Tag, InlineNotification } from '@carbon/react';
import { Add, Close, Edit, TrashCan } from '@carbon/icons-react';

export default function CarbonTest() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Carbon Components Test</h1>
      
      {/* Buttons */}
      <section style={{ marginBottom: 32 }}>
        <h2>Buttons</h2>
        <div style={{ display: 'flex', gap: 16 }}>
          <Button>Primary</Button>
          <Button kind="secondary">Secondary</Button>
          <Button kind="tertiary">Tertiary</Button>
          <Button kind="ghost">Ghost</Button>
          <Button kind="danger">Danger</Button>
        </div>
        
        <div style={{ marginTop: 16 }}>
          <Button renderIcon={Add}>Add Item</Button>
          <Button kind="secondary" renderIcon={Edit}>Edit</Button>
          <Button kind="danger" renderIcon={TrashCan}>Delete</Button>
        </div>
      </section>
      
      {/* Tags */}
      <section style={{ marginBottom: 32 }}>
        <h2>Tags</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tag type="blue">Scheduled</Tag>
          <Tag type="green">Completed</Tag>
          <Tag type="red">Urgent</Tag>
          <Tag type="purple">In Progress</Tag>
        </div>
      </section>
      
      {/* Notifications */}
      <section>
        <h2>Notifications</h2>
        <InlineNotification
          kind="info"
          title="New feature available"
          subtitle="Carbon Design System is now integrated!"
          hideCloseButton
        />
        <InlineNotification
          kind="success"
          title="Job completed"
          subtitle="The maintenance job has been completed successfully."
          hideCloseButton
        />
      </section>
    </div>
  );
}
```

### Step 3: Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/carbon-test` to verify components work.

---

## PHASE 2: Replace Buttons (30 minutes)

### Replace Navigation Buttons

Update `page.tsx` Sign Out button:

```tsx
// OLD
<button 
  className="btn btn-g btn-sm" 
  style={{ width: "100%", justifyContent: "center" }} 
  onClick={handleLogout}
>
  Sign out
</button>

// NEW
import { Button } from '@carbon/react';
import { Logout } from '@carbon/icons-react';

<Button 
  kind="ghost" 
  size="sm" 
  renderIcon={Logout}
  onClick={handleLogout}
  style={{ width: "100%" }}
>
  Sign out
</Button>
```

### Replace Calendar Navigation

Update `CalendarView.tsx`:

```tsx
// OLD
<button className="btn btn-s btn-sm" onClick={() => setWo(w => w - 1)}>‹ Prev</button>

// NEW
import { Button } from '@carbon/react';
import { ChevronLeft, ChevronRight } from '@carbon/icons-react';

<Button 
  kind="secondary" 
  size="sm" 
  renderIcon={ChevronLeft}
  onClick={() => setWo(w => w - 1)}
>
  Prev
</Button>
<Button kind="secondary" size="sm" onClick={() => setWo(0)}>Today</Button>
<Button 
  kind="secondary" 
  size="sm" 
  renderIcon={ChevronRight}
  iconDescription="Next"
  onClick={() => setWo(w => w + 1)}
>
  Next
</Button>
```

### Replace Modal Buttons

Update `JobCardModal.tsx` close button:

```tsx
// OLD
<button className="x-btn" onClick={onClose}>✕</button>

// NEW
import { IconButton } from '@carbon/react';
import { Close } from '@carbon/icons-react';

<IconButton 
  kind="ghost"
  size="sm"
  label="Close modal"
  onClick={onClose}
>
  <Close size={20} />
</IconButton>
```

---

## PHASE 3: Replace Icons (20 minutes)

### Update Navigation Icons

Update `page.tsx`:

```tsx
import {
  Dashboard,
  Calendar,
  Table,
  User,
  ContainerServices,
  ChartLine,
  FlagFilled,
  UserMultiple,
  Add,
} from '@carbon/icons-react';

const adminNav = [
  { id: "home", label: "Dashboard", Icon: Dashboard },
  { id: "calendar", label: "Calendar", Icon: Calendar },
  { id: "jobs", label: "Jobs", Icon: Table },
  { id: "customers", label: "Customers", Icon: User },
  { id: "gas-stock", label: "Gas Stock", Icon: ContainerServices },
  { id: "gas-usage", label: "Gas Usage", Icon: ChartLine },
  { id: "crm", label: "CRM", Icon: ChartLine },
  { id: "ods-report", label: "ODS Report", Icon: FlagFilled },
  { id: "users", label: "Users", Icon: UserMultiple },
];

// In render:
{nav.map(n => (
  <div key={n.id} className={`snav-item ${page === n.id ? "active" : ""}`}>
    <n.Icon size={18} />
    <span>{n.label}</span>
  </div>
))}
```

---

## PHASE 4: Replace Data Tables (1 hour)

### Update JobsTable with Carbon DataTable

```tsx
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
} from '@carbon/react';

// Define headers
const headers = [
  { key: 'id', header: 'Job ID' },
  { key: 'title', header: 'Title' },
  { key: 'customer', header: 'Customer' },
  { key: 'date', header: 'Date' },
  { key: 'type', header: 'Type' },
  { key: 'priority', header: 'Priority' },
  { key: 'status', header: 'Status' },
];

// Transform data
const rows = jobs.map(j => ({
  id: j.id,
  title: j.title,
  customer: customers.find(c => c.id === j.customerId)?.name,
  date: `${j.date} ${j.time}`,
  type: j.type,
  priority: j.priority,
  status: j.status,
}));

// Render
<DataTable rows={rows} headers={headers}>
  {({ rows, headers, getTableProps, getHeaderProps, getRowProps, getCellProps }) => (
    <TableContainer>
      <Table {...getTableProps()}>
        <TableHead>
          <TableRow>
            {headers.map(header => (
              <TableHeader {...getHeaderProps({ header })}>
                {header.header}
              </TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <TableRow {...getRowProps({ row })} onClick={() => onJobClick(row)}>
              {row.cells.map(cell => (
                <TableCell {...getCellProps({ cell })}>{cell.value}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )}
</DataTable>
```

---

## PHASE 5: Replace Tags (15 minutes)

### Update StatusTag with Carbon Tag

```tsx
import { Tag } from '@carbon/react';

const statusColors: Record<JobStatus, string> = {
  scheduled: 'blue',
  'in-progress': 'purple',
  'on-site': 'magenta',
  completed: 'green',
  cancelled: 'gray',
  'pending-parts': 'cool-gray',
  unallocated: 'warm-gray',
  'pending-booking': 'teal',
};

export function StatusTag({ status }: { status: JobStatus }) {
  const config = STATUS_CFG[status];
  const color = statusColors[status] || 'gray';
  
  return (
    <Tag type={color as any} size="sm">
      {config.label}
    </Tag>
  );
}
```

---

## PHASE 6: Advanced Components (2 hours)

### Replace Modal with Carbon Modal

```tsx
import { Modal, TextInput, Dropdown } from '@carbon/react';

<Modal
  open={showAddJob}
  modalHeading="Add New Job"
  primaryButtonText="Save"
  secondaryButtonText="Cancel"
  onRequestClose={() => setShowAddJob(false)}
  onRequestSubmit={handleSave}
>
  <TextInput
    id="job-title"
    labelText="Job Title"
    value={title}
    onChange={e => setTitle(e.target.value)}
  />
  
  <Dropdown
    id="job-type"
    titleText="Job Type"
    label="Select type"
    items={TYPE_OPTIONS}
    selectedItem={type}
    onChange={({ selectedItem }) => setType(selectedItem)}
  />
</Modal>
```

---

## Quick Reference: Component Mapping

| Your Current | Carbon Equivalent |
|-------------|-------------------|
| `className="btn btn-p"` | `<Button>` |
| `className="btn btn-s"` | `<Button kind="secondary">` |
| `className="btn btn-g"` | `<Button kind="ghost">` |
| `className="btn btn-d"` | `<Button kind="danger">` |
| `className="tag"` | `<Tag>` |
| `className="notif"` | `<InlineNotification>` |
| `className="inp"` | `<TextInput>` |
| `className="sel"` | `<Dropdown>` |
| `className="tbl-wrap"` | `<DataTable>` |
| `className="modal"` | `<Modal>` |

---

## Testing Checklist

- [ ] Buttons render correctly
- [ ] Icons display properly
- [ ] Tables sort and filter
- [ ] Modals open/close
- [ ] Forms validate
- [ ] Keyboard navigation works
- [ ] Screen readers announce correctly

---

## Troubleshooting

### Issue: Styles not loading
```bash
# Install sass if not already
npm install sass
```

### Issue: Icons not showing
```tsx
// Make sure you import correctly
import { Add } from '@carbon/icons-react';

// Use as component
<Add size={20} />
```

### Issue: TypeScript errors
```bash
# Install types if needed
npm install @types/carbon-components-react
```

---

## Timeline Summary

| Phase | Time | Priority |
|-------|------|----------|
| Setup | 15 min | 🔴 Critical |
| Buttons | 30 min | 🔴 Critical |
| Icons | 20 min | 🟡 High |
| Tables | 1 hour | 🟡 High |
| Tags | 15 min | 🟡 High |
| Advanced | 2 hours | 🟢 Medium |
| **Total** | **~4 hours** | |

---

Start with **Phase 1: Setup** and work your way down. Each phase builds on the previous one!

Need help with a specific component? Ask me to generate the code for it! 🚀
