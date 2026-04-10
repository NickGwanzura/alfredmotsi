# Carbon Design System Implementation Audit

**Project:** Splash Air - Field Service Management Platform  
**Audit Date:** 2026-04-09  
**Auditor:** Kimi Code CLI  
**Carbon Version:** Custom CSS Implementation (not @carbon/react)

---

## Executive Summary

### Current Implementation Status: ⚠️ PARTIAL

The dashboard uses a **custom CSS-based implementation** of Carbon Design System principles rather than the official `@carbon/react` component library. While this approach provides flexibility, it lacks full Carbon compliance and may miss accessibility features, design tokens updates, and component behaviors.

### Audit Score: **72/100**

| Category | Score | Status |
|----------|-------|--------|
| Visual Design | 85/100 | ✅ Strong |
| Typography | 90/100 | ✅ Excellent |
| Color Tokens | 80/100 | ✅ Good |
| Components | 65/100 | ⚠️ Partial |
| Accessibility | 55/100 | ⚠️ Needs Work |
| Layout Grid | 60/100 | ⚠️ Partial |
| Icons | 40/100 | ❌ Weak |
| Motion | 50/100 | ⚠️ Partial |

---

## 1. Implementation Approach Analysis

### Current: Custom CSS Carbon

The project implements Carbon through:
- Manual CSS variables matching Carbon G10 theme
- Custom-built React components
- IBM Plex Sans/Mono fonts
- Tailwind CSS alongside custom CSS

```css
/* Example: Manual Carbon tokens in globals.css */
:root {
  --bg: #f4f4f4;        /* $ui-background */
  --l1: #ffffff;        /* $layer-01 */
  --bi: #0f62fe;        /* $interactive */
  --tp: #161616;        /* $text-primary */
  /* ... etc */
}
```

### Recommended: Official @carbon/react

```bash
npm install @carbon/react @carbon/styles
```

```typescript
// Using official components
import { Button, DataTable, Modal } from '@carbon/react';
```

---

## 2. Detailed Findings

### ✅ STRENGTHS

#### 2.1 Typography (90/100)

**What's Working:**
- ✅ IBM Plex Sans for UI text
- ✅ IBM Plex Mono for code/data
- ✅ Proper font weights (300, 400, 500, 600, 700)
- ✅ Correct font sizes matching Carbon type scale

```css
/* Correct implementation */
font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
font-size: 14px;  /* $body-01 */
font-weight: 400;
line-height: 1.42857;
```

#### 2.2 Color Tokens (80/100)

**What's Working:**
- ✅ Carbon G10 (Light) theme base
- ✅ CSS custom properties for theming
- ✅ Proper contrast ratios
- ✅ Semantic color usage (success, error, warning)

**Carbon G10 Tokens Mapped:**
| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | #f4f4f4 | $ui-background |
| `--l1` | #ffffff | $layer-01 |
| `--bi` | #0f62fe | $interactive |
| `--tp` | #161616 | $text-primary |
| `--ts` | #525252 | $text-secondary |
| `--se` | #da1e28 | $support-error |
| `--ss` | #198038 | $support-success |

#### 2.3 Button Component (85/100)

**Implementation Quality:**
- ✅ Correct heights (40px primary, 32px small)
- ✅ Proper padding and spacing
- ✅ Hover, active, disabled states
- ✅ Icon support with gap

```css
.btn {
  height: 40px;
  padding: 0 var(--s6) 0 var(--s4);
  font-size: 14px;
  font-weight: 400;
  border-radius: 0;  /* Sharp corners - Carbon style */
  transition: background .11s;
}
```

#### 2.4 Form Inputs (80/100)

**Strengths:**
- ✅ Bottom border style (Carbon's "underline" input)
- ✅ Focus states with color change
- ✅ Helper text and error message styling
- ✅ Consistent heights (40px)

```css
.inp {
  border: none;
  border-bottom: 2px solid var(--bs2);
  height: 40px;
  transition: border-bottom-color .11s;
}
.inp:focus {
  border-bottom: 2px solid var(--ia);
}
```

---

### ⚠️ PARTIAL IMPLEMENTATIONS

#### 3.1 Layout Grid (60/100)

**Issues Found:**
- ❌ Missing Carbon's 16-column grid system
- ❌ Custom grid classes (`.g2`, `.g3`, `.g4`) instead of Carbon grid
- ⚠️ Responsive breakpoints don't match Carbon standards

**Current:**
```css
.g4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; }
```

**Should Be:**
```typescript
// Using Carbon Grid
import { Grid, Column } from '@carbon/react';

<Grid>
  <Column lg={4} md={2} sm={1}>Content</Column>
</Grid>
```

#### 3.2 Data Tables (65/100)

**Issues Found:**
- ⚠️ Basic table styling matches Carbon visually
- ❌ Missing advanced features:
  - Sorting
  - Pagination
  - Batch actions
  - Expandable rows
  - Column customization
- ❌ No row selection checkboxes

**Current Implementation:**
```typescript
// Basic custom table
table { width: 100%; border-collapse: collapse; }
```

**Should Use:**
```typescript
import { DataTable } from '@carbon/react';

<DataTable rows={rows} headers={headers}>
  {/* Full feature set */}
</DataTable>
```

#### 3.3 Modal/Dialogs (70/100)

**Issues Found:**
- ✅ Visual styling matches Carbon
- ⚠️ Missing focus trap
- ⚠️ No escape key handling
- ⚠️ No backdrop click handling
- ⚠️ Missing animation/transition standards

#### 3.4 Notifications (75/100)

**What's Working:**
- ✅ Visual styling (inline notifications)
- ✅ Color coding by type
- ✅ Title and body text structure

**Missing:**
- ❌ Toast notifications
- ❌ Actionable notifications
- ❌ Low contrast variant
- ❌ Dismissible behavior

---

### ❌ MISSING COMPONENTS

#### 4.1 Icons (40/100)

**Critical Issue:** Using unicode symbols instead of Carbon icons

**Current:**
```typescript
// Using emojis and unicode
{ icon: "⊞" },  // Dashboard
{ icon: "⊟" },  // Calendar
{ icon: "⚙" },  // Installation
```

**Should Use:**
```typescript
import { Dashboard, Calendar, Settings } from '@carbon/icons-react';

<Dashboard size={20} />
```

#### 4.2 Navigation (55/100)

**Issues:**
- ⚠️ SideNav structure is custom
- ❌ Missing UI Shell components
- ❌ No header actions pattern
- ❌ Missing overflow menu

#### 4.3 Tags & Badges (60/100)

**Current:** Custom implementation
```typescript
<span className="tag">Label</span>
```

**Should Use:**
```typescript
import { Tag } from '@carbon/react';

<Tag type="blue">Label</Tag>
```

#### 4.4 Loading States (30/100)

**Missing:**
- Loading spinner/skeleton components
- Progress indicators
- Inline loading for buttons

#### 4.5 Overflow Menus (0/100)

**Not implemented** - using direct buttons instead

#### 4.6 Pagination (0/100)

**Not implemented** - no pagination component

#### 4.7 Tabs (70/100)

**Current:** Basic custom tabs
```css
.tabs { display: flex; border-bottom: 1px solid var(--bs1); }
.tab { padding: 0 var(--s5); height: 40px; }
```

**Missing:**
- Contained tabs variant
- Icon tabs
- Disabled tab state
- Overflow handling

#### 4.8 Breadcrumb (0/100)

**Not implemented**

#### 4.9 Accordion (0/100)

**Not implemented**

#### 4.10 Dropdown/Select (50/100)

**Current:** Native HTML select with styling
**Issues:**
- ❌ No multi-select
- ❌ No searchable/combobox
- ❌ No item icons

---

## 3. Accessibility Audit (55/100)

### Issues Found:

| Issue | Severity | Location |
|-------|----------|----------|
| Missing ARIA labels | High | Tables, Icons |
| No focus indicators | High | Interactive elements |
| Color-only status | Medium | Status tags |
| Missing alt text | Medium | Avatar images |
| No skip links | Medium | Page navigation |
| Keyboard navigation | Low | Modal focus trap |

### Recommendations:

```typescript
// Add ARIA labels
<button aria-label="Close modal">✕</button>

// Focus visible styling
:focus-visible {
  outline: 2px solid var(--bi);
  outline-offset: 2px;
}

// Status with icons (not just color)
<span role="status">
  <SuccessIcon /> Completed
</span>
```

---

## 4. Motion & Animation (50/100)

### Current State:
- ✅ Basic fade-in animation (`.fi-anim`)
- ✅ Hover transitions (0.11s)

### Missing:
- ❌ Consistent motion tokens
- ❌ Modal enter/exit animations
- ❌ Loading animations
- ❌ Skeleton screens
- ❌ Micro-interactions

**Carbon Motion Standards:**
```css
/* Standard durations */
--duration-fast: 110ms;
--duration-moderate: 240ms;
--duration-slow: 400ms;

/* Standard easing */
--easing-productive: cubic-bezier(0, 0, 0.38, 0.9);
--easing-expressive: cubic-bezier(0.4, 0.14, 0.3, 1);
```

---

## 5. Migration Path Recommendations

### Option 1: Full Migration to @carbon/react (Recommended)

**Timeline:** 4-6 weeks  
**Effort:** High  
**Benefit:** Maximum

**Steps:**
1. Install `@carbon/react` and `@carbon/styles`
2. Replace components incrementally:
   - Week 1: Buttons, Tags, Icons
   - Week 2: Forms, Inputs
   - Week 3: Tables, Modals
   - Week 4: Navigation, Layout
3. Update tests
4. Accessibility audit
5. Performance optimization

**Pros:**
- Full Carbon compliance
- Built-in accessibility
- Regular updates
- Community support

**Cons:**
- Significant refactoring
- Bundle size increase (~200KB)
- Learning curve

---

### Option 2: Hybrid Approach (Immediate)

**Timeline:** 2 weeks  
**Effort:** Medium  
**Benefit:** Moderate

**Steps:**
1. Install `@carbon/icons-react` for icons
2. Add `@carbon/styles` for design tokens
3. Update CSS variables to use Carbon tokens
4. Keep custom components, but use Carbon patterns

**Pros:**
- Faster implementation
- Smaller changes
- Maintains custom flexibility

**Cons:**
- Not full Carbon compliance
- Manual maintenance required

---

### Option 3: Design System Documentation (Quick Win)

**Timeline:** 1 week  
**Effort:** Low  
**Benefit:** Documentation

**Steps:**
1. Document existing component patterns
2. Create component usage guidelines
3. Add Storybook for component showcase
4. Accessibility guidelines

---

## 6. Priority Actions

### 🔴 Critical (Do Now)

1. **Add Icon Library**
   ```bash
   npm install @carbon/icons-react
   ```
   Replace all unicode symbols with proper icons

2. **Fix Accessibility**
   - Add ARIA labels to interactive elements
   - Implement focus management in modals
   - Add skip navigation link

3. **Color Token Audit**
   - Verify all colors meet WCAG 2.1 AA
   - Add high contrast mode support

### 🟡 High Priority (This Month)

4. **Data Table Enhancement**
   - Add sorting functionality
   - Implement pagination
   - Add row selection

5. **Loading States**
   - Create Loading component
   - Add skeleton screens for data

6. **Motion Standards**
   - Define consistent animation tokens
   - Add loading spinner animation

### 🟢 Medium Priority (Next Quarter)

7. **Component Documentation**
   - Set up Storybook
   - Document usage patterns

8. **Navigation Improvements**
   - Add breadcrumbs
   - Improve mobile navigation

9. **Consider Full Migration**
   - Evaluate @carbon/react adoption

---

## 7. Code Examples

### Current Implementation vs Carbon Best Practice

#### Buttons

**Current:**
```typescript
<button className="btn btn-p">Save</button>
```

**Carbon:**
```typescript
import { Button } from '@carbon/react';

<Button kind="primary">Save</Button>
```

#### Data Table

**Current:**
```typescript
<table className="tbl-wrap">
  {/* Basic table */}
</table>
```

**Carbon:**
```typescript
import { DataTable } from '@carbon/react';

<DataTable 
  rows={rows} 
  headers={headers}
  isSortable
  size="md"
>
  {/* Full-featured table */}
</DataTable>
```

#### Icons

**Current:**
```typescript
<span>⊞</span>  // Unicode symbol
```

**Carbon:**
```typescript
import { Dashboard } from '@carbon/icons-react';

<Dashboard size={20} />
```

---

## 8. Resources

- [Carbon Design System](https://carbondesignsystem.com/)
- [@carbon/react Documentation](https://react.carbondesignsystem.com/)
- [Carbon Icons](https://carbon-icons.netlify.app/)
- [Figma Kit](https://www.figma.com/community/file/1299466042662367149)

---

## Appendix: Component Inventory

### Custom Components (Current)

| Component | File | Carbon Equivalent | Status |
|-----------|------|-------------------|--------|
| Button | globals.css | Button | ⚠️ Partial |
| TextInput | globals.css | TextInput | ⚠️ Partial |
| Select | globals.css | Dropdown | ⚠️ Partial |
| Table | globals.css | DataTable | ⚠️ Partial |
| Modal | globals.css | Modal | ⚠️ Partial |
| Notification | globals.css | InlineNotification | ⚠️ Partial |
| Avatar | ui.tsx | — | ✅ Custom |
| StatusTag | ui.tsx | Tag | ⚠️ Partial |
| Tabs | globals.css | Tabs | ⚠️ Partial |
| SideNav | globals.css | SideNav | ⚠️ Partial |
| Header | globals.css | Header | ⚠️ Partial |

### Missing Carbon Components

- Accordion
- Breadcrumb
- Checkbox
- ContentSwitcher
- DatePicker
- FileUploader
- NumberInput
- OverflowMenu
- Pagination
- ProgressIndicator
- RadioButton
- Search
- Slider
- StructuredList
- TimePicker
- Toggle
- Tooltip
- TreeView
