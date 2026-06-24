# Splash Air CRM — Handover Notes
_Last updated: 2026-06-24_

---

## 1. Remove Carbon UI From All Modals

**Priority: High — visually broken, sharp/flat Carbon DS styling still present**

The following modal components still use legacy Carbon Design System class names (`overlay`, `modal`, `modal-hdr`, `modal-lbl`, `modal-title`, `modal-body`, `modal-foot`, `x-btn`, `btn`, `btn-g`, `btn-p`, `inp`, `sel`, `form-label`, `g2`, `notif`, `notif-e`, `notif-w`). These classes are **not defined in globals.css** — they were inherited from an older Carbon import that no longer exists, so the modals partially fall back to browser defaults with sharp corners and flat buttons.

**Files to rewrite** (use `UserManagement.tsx` modals as the reference — those are already in the correct modern style):

| File | Current state |
|---|---|
| `src/app/components/AddCustomerModal.tsx` | All Carbon classes — full rewrite needed |
| `src/app/components/AddGasStockModal.tsx` | All Carbon classes — full rewrite needed |
| `src/app/components/AddGasUsageModal.tsx` | All Carbon classes — full rewrite needed |
| `src/app/components/AddCRMModal.tsx` | All Carbon classes — full rewrite needed |
| `src/app/components/AddJobModal.tsx` | Partially modernised — inputs/buttons still flat (no `rounded-lg`) |
| `src/app/components/JobCardModal.tsx` | Review tabs, form inputs, action buttons for Carbon remnants |

**Target style** (copy this pattern for all inputs, selects, buttons):
```tsx
// Input
<input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" />

// Select
<select className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" />

// Textarea
<textarea className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full resize-vertical" />

// Modal wrapper
<div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 lg:p-8">
  <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden">
    {/* Header */}
    <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Section Label</p>
        <h2 className="text-xl font-bold text-gray-900 mt-1">Modal Title</h2>
      </div>
      <button className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1"><X size={20} /></button>
    </div>
    {/* Body */}
    <div className="px-6 py-5 space-y-4">...</div>
    {/* Footer */}
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
      <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">Cancel</button>
      <button className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg cursor-pointer">Save</button>
    </div>
  </div>
</div>
```

---

## 2. Add Gas Types

**Priority: High — users can't log many common refrigerants**

**File:** `src/app/lib/config.ts` line 45  
**Also:** `src/app/components/AddGasStockModal.tsx` line 14 (has a duplicate local array — consolidate it to import from config)

Current list (7 types):
```ts
export const REFRIGERANT_TYPES = ["R-32", "R-410A", "R-22", "R-134a", "R-407C", "R-600A", "R-290"];
```

Expanded list to use:
```ts
export const REFRIGERANT_TYPES = [
  // HFCs — common AC
  "R-32", "R-410A", "R-22", "R-134a", "R-407C", "R-407A", "R-407F",
  "R-404A", "R-507A", "R-422D", "R-417A", "R-438A",
  // Low-GWP / next-gen
  "R-454B", "R-452A", "R-448A", "R-449A", "R-513A", "R-466A", "R-1234yf",
  // Hydrocarbons
  "R-290", "R-600A", "R-1270",
  // Other
  "R-744 (CO₂)", "R-717 (Ammonia)",
];
```

After updating config.ts, remove the local `GAS_TYPES` array from `AddGasStockModal.tsx` and import `REFRIGERANT_TYPES` from config instead.

---

## 3. UI/UX Audit — Other Findings

These were identified during the audit session but not yet fixed.

### 3a. Avatar component is square — should be circular
**File:** `src/app/components/ui.tsx` line 55  
Add `rounded-full` to the Avatar `div`:
```tsx
// Before
<div className="flex items-center justify-center font-semibold shrink-0 font-sans text-white" style={{ ... }}>
// After
<div className="flex items-center justify-center font-semibold shrink-0 font-sans text-white rounded-full" style={{ ... }}>
```

### 3b. StatusTag / PrioTag / AlertTag have no border-radius
**File:** `src/app/components/ui.tsx` lines 31–53  
Add `rounded-full` to all three tag components. They look like flat rectangles while everything else in the UI uses rounded pills.

### 3c. Jobs table displays raw UUID in "Job ID" column
**File:** `src/app/components/JobsTable.tsx` line 138  
Change `{j.id}` to `{j.jobCardRef}` — the UUID is useless to users; jobCardRef (e.g. `JC-123456`) is what staff refer to.

### 3d. Jobs table search input height inconsistency
**File:** `src/app/components/JobsTable.tsx` line 88–95  
Search input uses `h-9` (36px) while the two selects use `h-11` (44px). Change search input to `h-11` to match.

### 3e. "Send Announcement" button has no confirmation
**File:** `src/app/components/AdminDashboard.tsx` line 85  
One click sends a mass email to all users. Add a confirmation modal or at minimum a `window.confirm()` before calling the API.

### 3f. Sidebar nav items below touch target minimum
**File:** `src/app/page.tsx` line 458  
Nav items use `h-8` (32px) — below the 44px touch minimum on mobile. Change to `h-11` or `min-h-[44px]`.

### 3g. FormItem label font size is 11px (below accessible minimum)
**File:** `src/app/components/ui.tsx` line 120  
`text-[11px]` is below the 12px accessible minimum. Change to `text-xs` (12px).

---

## 4. Password Reset (Already Built)

No work needed — this feature is fully implemented:
- **API:** `POST /api/admin/users/resend-credentials` — generates a new temp password, updates the DB, sends email
- **UI:** Mail icon button on each row in User Management → "Resend Credentials" confirmation modal

To reset Alfred's password: log in as admin → User Management → click the mail icon on Alfred's row → confirm.

---

## Notes

- Reference modal for correct styling: `src/app/components/UserManagement.tsx` (the invite/edit/resend/delete modals are already in the correct modern style)
- Design tokens are in `src/app/globals.css` under `@theme` — use `brand-600`, `brand-700`, `gray-*` Tailwind classes, not the legacy `--cds-*` variables
- The legacy `--cds-*` variables in `:root` can be cleaned up once all Carbon class usage is gone
