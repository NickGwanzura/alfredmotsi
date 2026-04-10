# Branded Email Templates

A comprehensive collection of beautifully designed, production-ready email templates for HVAC service businesses.

## Design System

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#0ea5e9` | Buttons, links, headers |
| Primary Dark | `#0284c7` | Gradient end |
| Accent | `#f59e0b` | Warning states, highlights |
| Success | `#10b981` | Completed, success states |
| Error | `#ef4444` | Errors, cancellations |
| Background | `#f8fafc` | Email background |
| Surface | `#ffffff` | Card background |

### Typography
- **Font Family**: Inter, system-ui, sans-serif
- **H1**: 28px, weight 700
- **H2**: 20px, weight 600
- **Body**: 16px, weight 400
- **Small**: 14px, 12px

### Spacing
- Consistent 8px base unit
- Responsive padding
- Mobile-first approach

---

## Available Templates

### 1. Client Portal Invite

**Purpose**: Welcome new clients to their portal  
**Template**: `ClientPortalInviteEmail`  
**Send Function**: `sendPortalInvite()`

```typescript
import { sendPortalInvite } from './send-branded';

await sendPortalInvite({
  to: 'client@splashaircrmzw.site',
  customerName: 'John Smith',
  portalCode: 'PORT-12345',
  email: 'client@splashaircrmzw.site',
  loginUrl: 'https://splashaircrmzw.site/portal',
  companyName: 'Splash Air', // Optional
});
```

**Features**:
- Portal credentials display
- Feature list with icons
- Security notice
- Clear CTA button

---

### 2. Service Confirmation

**Purpose**: Confirm scheduled appointments  
**Template**: `ServiceConfirmationEmail`  
**Send Function**: `sendServiceConfirmation()`

```typescript
import { sendServiceConfirmation } from './send-branded';

await sendServiceConfirmation({
  to: 'client@splashaircrmzw.site',
  customerName: 'John Smith',
  serviceType: 'AC Installation',
  serviceDate: 'Monday, April 15, 2026',
  serviceTime: '09:00 - 11:00',
  technicianName: 'Mike Johnson',
  technicianPhone: '+27 12 345 6789',
  address: '123 Main Street, Johannesburg',
  referenceNumber: 'JOB-2026-001',
  portalUrl: 'https://splashaircrmzw.site/track/JOB-2026-001',
});
```

**Features**:
- Appointment details card
- Technician contact info
- Pre-arrival checklist
- Tracking link (optional)

---

### 3. Service Completion

**Purpose**: Report completed work  
**Template**: `ServiceCompletionEmail`  
**Send Function**: `sendServiceCompletion()`

```typescript
import { sendServiceCompletion } from './send-branded';

await sendServiceCompletion({
  to: 'client@splashaircrmzw.site',
  customerName: 'John Smith',
  serviceType: 'AC Maintenance',
  completionDate: 'April 15, 2026',
  technicianName: 'Mike Johnson',
  workSummary: 'Performed comprehensive maintenance including filter replacement, coil cleaning, refrigerant check, and system diagnostics. Unit operating at optimal efficiency.',
  recommendations: 'Consider upgrading to smart thermostat for better energy management.',
  nextServiceDate: 'October 15, 2026',
  reportUrl: 'https://splashaircrmzw.site/reports/abc123',
});
```

**Features**:
- Work summary section
- Technician recommendations
- Next service reminder
- Downloadable report link

---

### 4. Status Update

**Purpose**: Notify clients of status changes  
**Template**: `StatusUpdateEmail`  
**Send Function**: `sendStatusUpdate()`

```typescript
import { sendStatusUpdate } from './send-branded';

await sendStatusUpdate({
  to: 'client@splashaircrmzw.site',
  customerName: 'John Smith',
  serviceType: 'AC Repair',
  referenceNumber: 'JOB-2026-001',
  previousStatus: 'scheduled',
  newStatus: 'on-site',
  updatedBy: 'Mike Johnson',
  updateTime: '09:15 AM',
  notes: 'Technician has arrived and is beginning initial diagnostics.',
  portalUrl: 'https://splashaircrmzw.site/track/JOB-2026-001',
});
```

**Status Options**:
- `scheduled` → 📅 Blue
- `in-progress` → ⏳ Yellow
- `on-site` → 🔧 Orange
- `completed` → ✓ Green
- `cancelled` → ✕ Red
- `delayed` → ⚠ Yellow

---

### 5. Technician Assignment

**Purpose**: Notify technicians of new jobs  
**Template**: `TechnicianAssignmentEmail`  
**Send Function**: `sendTechnicianAssignment()`

```typescript
import { sendTechnicianAssignment } from './send-branded';

await sendTechnicianAssignment({
  to: 'tech@splashaircrmzw.site',
  technicianName: 'Mike',
  customerName: 'John Smith',
  serviceType: 'AC Installation',
  serviceDate: 'April 15, 2026',
  serviceTime: '09:00 - 11:00',
  address: '123 Main Street, Johannesburg',
  jobDescription: 'Install new 18,000 BTU split system in master bedroom. Customer requires mounting at 2.4m height. Bring ladder.',
  customerPhone: '+27 12 345 6789',
  referenceNumber: 'JOB-2026-001',
  dashboardUrl: 'https://splashaircrmzw.site/tech/jobs/JOB-2026-001',
});
```

**Features**:
- Job details card
- Field reminders checklist
- Direct link to job card

---

### 6. Reminder Email

**Purpose**: Appointment reminders (24h before)  
**Template**: `ReminderEmail`  
**Send Function**: `sendReminder()`

```typescript
import { sendReminder } from './send-branded';

await sendReminder({
  to: 'client@splashaircrmzw.site',
  customerName: 'John Smith',
  serviceType: 'AC Maintenance',
  serviceDate: 'Tomorrow, April 15',
  serviceTime: '09:00 - 11:00',
  technicianName: 'Mike Johnson',
  address: '123 Main Street, Johannesburg',
  referenceNumber: 'JOB-2026-001',
  portalUrl: 'https://splashaircrmzw.site/manage/JOB-2026-001',
});
```

**Features**:
- Tomorrow indicator
- Quick reschedule link
- Preparation notes

---

### 7. Follow-Up Email

**Purpose**: Post-service feedback request  
**Template**: `FollowUpEmail`  
**Send Function**: `sendFollowUp()`

```typescript
import { sendFollowUp } from './send-branded';

await sendFollowUp({
  to: 'client@splashaircrmzw.site',
  customerName: 'John Smith',
  serviceType: 'AC Maintenance',
  completionDate: 'April 15, 2026',
  feedbackUrl: 'https://splashaircrmzw.site/feedback/abc123',
  reviewUrl: 'https://g.page/example/review',
});
```

**Features**:
- Quick feedback CTA
- Review link (optional)
- Non-transactional (marketing category)

---

### 8. Welcome Email

**Purpose**: Welcome new customers  
**Template**: `WelcomeEmail`  
**Send Function**: `sendWelcome()`

```typescript
import { sendWelcome } from './send-branded';

await sendWelcome({
  to: 'client@splashaircrmzw.site',
  customerName: 'John Smith',
  portalUrl: 'https://splashaircrmzw.site/portal',
});
```

**Features**:
- Company value propositions
- Portal access CTA
- Feature highlights

---

## Batch Sending

Send multiple emails efficiently:

```typescript
import { sendReminders, sendTechnicianAssignments } from './send-branded';

// Send reminders to all customers with appointments tomorrow
const reminders = [
  { to: 'client1@splashaircrmzw.site', customerName: 'John', ... },
  { to: 'client2@splashaircrmzw.site', customerName: 'Jane', ... },
];

const results = await sendReminders(reminders);
console.log(`Sent: ${results.success}, Failed: ${results.failed}`);

// Assign jobs to multiple technicians
const assignments = [
  { to: 'tech1@splashaircrmzw.site', technicianName: 'Mike', ... },
  { to: 'tech2@splashaircrmzw.site', technicianName: 'Sarah', ... },
];

const results = await sendTechnicianAssignments(assignments);
```

---

## Customization

### Company Name

All templates accept an optional `companyName` parameter:

```typescript
await sendServiceConfirmation({
  ...params,
  companyName: 'CoolBreeze HVAC', // Defaults to 'Splash Air'
});
```

### Custom Templates

Use the reusable components to build custom templates:

```typescript
import { 
  StatusBadge, 
  InfoBox, 
  DetailCard, 
  FeatureList,
  globalStyles 
} from './templates-branded';

// Build your own template
<Html>
  <Body style={globalStyles.main}>
    <StatusBadge status="success">Confirmed</StatusBadge>
    <DetailCard items={[{ label: 'Name', value: 'John' }]} />
    <InfoBox variant="info" title="Note">Custom message</InfoBox>
  </Body>
</Html>
```

---

## Email Subject Lines

| Template | Subject Format |
|----------|---------------|
| Portal Invite | `"Your [Company] Portal Access is Ready"` |
| Confirmation | `"✓ Confirmed: [Service] on [Date]"` |
| Completion | `"✓ Completed: Your [Service]"` |
| Status Update | `"Status Update: [Service] is now [Status]"` |
| Reminder | `"Reminder: Your [Service] is tomorrow"` |
| Follow-Up | `"How was your [Service] experience?"` |
| Welcome | `"Welcome to [Company]!"` |

---

## Responsive Design

All templates are mobile-responsive:
- Stack on mobile (< 480px)
- Comfortable touch targets (44px minimum)
- Readable font sizes (14px minimum)
- Single-column layout on small screens

---

## Accessibility

- WCAG 2.1 AA compliant color contrast
- Semantic HTML structure
- Alt text support for images
- Screen reader friendly
- Reduced motion support

---

## Testing

Preview templates before sending:

```bash
# Install React Email
npm install @react-email/cli

# Run preview server
npx react-email dev

# Or use the email method
import { render } from '@react-email/components';

const html = await render(ServiceConfirmationEmail({ ... }));
console.log(html); // Inspect output
```

---

## Migration from Old Templates

Replace old template imports:

```typescript
// OLD
import { sendJobScheduledEmail } from './send';

// NEW
import { sendServiceConfirmation } from './send-branded';
```

Parameter mapping:

| Old Parameter | New Parameter |
|--------------|---------------|
| `jobTitle` | `serviceType` |
| `jobDate` | `serviceDate` |
| `jobTime` | `serviceTime` |
| `jobAddress` | `address` |
| `jobId` | `referenceNumber` |

---

## Best Practices Enforced

All branded templates automatically:
- ✅ Generate plain text versions
- ✅ Add deliverability headers
- ✅ Validate email content
- ✅ Apply rate limiting
- ✅ Set proper reply-to
- ✅ Include preview text
- ✅ Mobile-responsive design
