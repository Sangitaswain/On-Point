# UI/UX Specifications: OnPoint

**Version 1.0 | March 2026**
**References:** FP.md (component architecture) · PRD.md (features) · TOOLS_AND_TECHNOLOGIES.md (Tailwind, shadcn/ui)

---

## Purpose

This document defines the visual and interaction standards that every component must follow throughout all 18 implementation steps. Whenever a component is built, this document answers: what does it look like, how does it behave on interaction, what does it show when loading, empty, or broken?

Claude must reference this document when building any UI component. Deviating from these specs without a documented reason creates visual inconsistency across the app.

---

## Table of Contents

1. [Design System Foundation](#1-design-system-foundation)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Border Radius & Shadows](#5-border-radius--shadows)
6. [Animation & Transitions](#6-animation--transitions)
7. [Component States](#7-component-states)
8. [Loading & Skeleton States](#8-loading--skeleton-states)
9. [Empty States](#9-empty-states)
10. [Error States](#10-error-states)
11. [Toast Notifications](#11-toast-notifications)
12. [Card Labels Design System](#12-card-labels-design-system)
13. [Accessibility Standards](#13-accessibility-standards)
14. [Responsive Breakpoints](#14-responsive-breakpoints)
15. [Icon System](#15-icon-system)
16. [Component-by-Component Specifications](#16-component-by-component-specifications)

---

## 1. Design System Foundation

OnPoint uses **shadcn/ui** as its component foundation. shadcn/ui components are copied into `components/ui/` and are owned by the project — they can be modified. All customization happens via Tailwind CSS utility classes and CSS variables defined in `globals.css`.

### Core Principles

**Density over decoration.** OnPoint is a productivity tool. Every pixel earns its place. No gratuitous gradients, decorative borders, or animations that don't communicate state.

**Consistent spacing.** Use the Tailwind spacing scale exclusively. Never use arbitrary values like `mt-[13px]` unless absolutely necessary. Prefer multiples of 4px (Tailwind's base unit).

**Predictable interaction.** Every interactive element behaves the same way. Hover states are consistent. Focus rings are always visible. Disabled states always look the same.

**Dark mode is first-class.** Every component is built for light mode, then dark mode variants are added immediately. Dark mode is not an afterthought.

---

## 2. Color System

### 2.1 CSS Variable Definitions

shadcn/ui uses CSS variables for its color system. These are defined in `app/globals.css`. The Zinc-based palette (chosen at shadcn/ui init) is the default.

**Light mode variables (`:root`):**

```css
--background: 0 0% 100%;          /* pure white */
--foreground: 240 10% 3.9%;       /* near black */
--card: 0 0% 100%;
--card-foreground: 240 10% 3.9%;
--popover: 0 0% 100%;
--popover-foreground: 240 10% 3.9%;
--primary: 240 5.9% 10%;          /* near black — main action color */
--primary-foreground: 0 0% 98%;
--secondary: 240 4.8% 95.9%;      /* light gray — secondary buttons */
--secondary-foreground: 240 5.9% 10%;
--muted: 240 4.8% 95.9%;          /* very light gray — muted text bg */
--muted-foreground: 240 3.8% 46.1%;
--accent: 240 4.8% 95.9%;         /* hover highlight */
--accent-foreground: 240 5.9% 10%;
--destructive: 0 84.2% 60.2%;     /* red — delete actions */
--destructive-foreground: 0 0% 98%;
--border: 240 5.9% 90%;           /* subtle border */
--input: 240 5.9% 90%;
--ring: 240 5.9% 10%;             /* focus ring */
```

**Dark mode variables (`.dark`):**

```css
--background: 240 10% 3.9%;       /* near black */
--foreground: 0 0% 98%;           /* near white */
--card: 240 10% 3.9%;
--card-foreground: 0 0% 98%;
--popover: 240 10% 3.9%;
--popover-foreground: 0 0% 98%;
--primary: 0 0% 98%;              /* near white — main action color in dark */
--primary-foreground: 240 5.9% 10%;
--secondary: 240 3.7% 15.9%;
--secondary-foreground: 0 0% 98%;
--muted: 240 3.7% 15.9%;
--muted-foreground: 240 5% 64.9%;
--accent: 240 3.7% 15.9%;
--accent-foreground: 0 0% 98%;
--destructive: 0 62.8% 30.6%;
--destructive-foreground: 0 0% 98%;
--border: 240 3.7% 15.9%;
--input: 240 3.7% 15.9%;
--ring: 240 4.9% 83.9%;
```

### 2.2 Semantic Color Usage

| Use Case | Light Class | Dark Class |
|---|---|---|
| Page background | `bg-background` | (auto via CSS var) |
| Primary text | `text-foreground` | (auto) |
| Secondary/muted text | `text-muted-foreground` | (auto) |
| Sidebar background | `bg-zinc-50` | `dark:bg-zinc-950` |
| Sidebar border | `border-zinc-200` | `dark:border-zinc-800` |
| Card background | `bg-white` | `dark:bg-zinc-900` |
| Column background | `bg-zinc-100` | `dark:bg-zinc-800/50` |
| Active nav item | `bg-zinc-100` | `dark:bg-zinc-800` |
| Destructive action | `text-red-600` | `dark:text-red-400` |
| Success feedback | `text-green-600` | `dark:text-green-400` |
| Warning | `text-amber-600` | `dark:text-amber-400` |
| Online presence dot | `bg-green-500` | (same) |
| Overdue date badge | `bg-red-100 text-red-700` | `dark:bg-red-950 dark:text-red-400` |

### 2.3 Brand/Accent Color

OnPoint does not use a custom brand color for v1. The primary action color is near-black in light mode and near-white in dark mode (shadcn Zinc defaults). This keeps the UI clean and tool-like — not distracting.

---

## 3. Typography

### 3.1 Font

**Font family:** Inter (loaded via `next/font/google` in `app/layout.tsx`)

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
```

Apply to `<html>` element: `className={inter.className}`

**Fallback stack:** `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

**Monospace (for code in descriptions):** Default system mono — no custom monospace font needed in v1.

### 3.2 Type Scale

| Use | Class | Size | Weight | Line Height |
|---|---|---|---|---|
| Page heading (H1) | `text-2xl font-semibold` | 24px | 600 | tight |
| Section heading (H2) | `text-lg font-semibold` | 18px | 600 | tight |
| Card title | `text-sm font-medium` | 14px | 500 | normal |
| Body / paragraph | `text-sm` | 14px | 400 | relaxed |
| Small / meta | `text-xs` | 12px | 400 | normal |
| Muted / secondary | `text-sm text-muted-foreground` | 14px | 400 | normal |
| Column title | `text-sm font-semibold` | 14px | 600 | normal |
| Board title | `text-xl font-semibold` | 20px | 600 | tight |
| Workspace name (sidebar) | `text-sm font-medium` | 14px | 500 | normal |

### 3.3 Text Overflow Rules

- Card titles in `CardItem`: `truncate` (single-line ellipsis)
- Sidebar workspace names: `truncate`
- Notification messages: `line-clamp-2` (2-line clamp)
- Activity log entries: `line-clamp-1`
- Column titles: `truncate` (never wrap)

---

## 4. Spacing & Layout

### 4.1 Base Spacing Unit

Tailwind's spacing scale is based on 4px. All spacing values are multiples of this.

### 4.2 Layout Dimensions

| Element | Value | Tailwind Class |
|---|---|---|
| Sidebar width (desktop) | 240px | `w-60` |
| Sidebar padding | 12px horizontal | `px-3` |
| Board header height | 56px | `h-14` |
| Column width | 280px (fixed) | `w-70` or `min-w-[280px]` |
| Column padding | 12px | `p-3` |
| Card padding | 12px | `p-3` |
| Card gap (between cards) | 8px | `gap-2` |
| Column gap (between columns) | 16px | `gap-4` |
| Board horizontal padding | 24px | `px-6` |
| Modal max width | 672px | `max-w-2xl` |
| Chat panel width (desktop) | 320px | `w-80` |
| Activity log panel width | 384px | `w-96` |
| Notification popover width | 384px | `w-96` |

### 4.3 Content Area

The main content area (right of sidebar) fills the remaining viewport width:
```css
flex-1 overflow-auto
```

The board view is a horizontal scroll container:
```css
flex flex-row gap-4 overflow-x-auto px-6 py-4 h-full
```

### 4.4 Z-Index Scale

| Layer | Z-Index | Usage |
|---|---|---|
| Base content | 0 | Columns, cards |
| Sticky header | 10 | Board header, sidebar |
| Drag overlay | 50 | dnd-kit DragOverlay |
| Dropdown/popover | 100 | shadcn Popover, Command |
| Modal | 200 | shadcn Dialog |
| Toast | 300 | shadcn Toast |
| Sidebar sheet (mobile) | 400 | Sheet component |
| Tooltip | 500 | shadcn Tooltip |

---

## 5. Border Radius & Shadows

### 5.1 Border Radius

| Element | Value | Class |
|---|---|---|
| Card | 8px | `rounded-lg` |
| Column | 8px | `rounded-lg` |
| Button | 6px | `rounded-md` (shadcn default) |
| Input | 6px | `rounded-md` |
| Badge/label chip | full pill | `rounded-full` |
| Avatar | full circle | `rounded-full` |
| Modal | 12px | `rounded-xl` (shadcn Dialog default) |
| Tooltip | 6px | `rounded-md` |
| Dropdown menu | 8px | `rounded-lg` |
| Mobile modal (bottom sheet) | 24px top only | `rounded-t-2xl` |

### 5.2 Shadows

OnPoint uses minimal shadows — depth is communicated through background contrast, not heavy drop shadows.

| Element | Shadow Class |
|---|---|
| Card (resting) | none — relies on column bg contrast |
| Card (hover) | `shadow-sm` |
| Card (dragging) | `shadow-lg` |
| Drag overlay | `shadow-2xl rotate-2` |
| Modal/dialog | shadcn default (`shadow-xl`) |
| Dropdown/popover | shadcn default (`shadow-md`) |
| Sidebar | `border-r` only — no shadow |

---

## 6. Animation & Transitions

### 6.1 Standard Transition

All interactive elements that change visual state use:
```css
transition-colors duration-150
```
This includes: hover, focus, active states on buttons, links, list items.

### 6.2 Panel Animations

| Panel | Animation |
|---|---|
| Activity log panel (slide in) | `translate-x-full → translate-x-0`, `duration-200`, `ease-out` |
| Chat panel (slide in) | same as activity log |
| Mobile sidebar Sheet | shadcn Sheet default (200ms slide) |
| Card modal | shadcn Dialog default (fade + scale, 150ms) |
| Notification popover | shadcn Popover default (fade, 100ms) |

### 6.3 Presence Avatar Animation

New avatars in the presence bar:
```css
animate-in fade-in slide-in-from-right-1 duration-300
```

Departing avatars:
```css
animate-out fade-out slide-out-to-right-1 duration-200
```

### 6.4 Drag Animations

| State | Visual |
|---|---|
| Drag start | Card gets `opacity-50`, DragOverlay renders a full-opacity copy with `rotate-1 shadow-2xl` |
| Over a valid drop zone | Target column background shifts: `bg-zinc-200 dark:bg-zinc-700` |
| Drop success | Card snaps to new position (dnd-kit handles this) |
| Drop failure / revert | Card snaps back (optimistic update reverted in 150ms) |

### 6.5 Skeleton/Loading Animation

```css
animate-pulse bg-zinc-200 dark:bg-zinc-700
```

All skeleton elements use rounded-md and the same dimensions as the content they replace.

### 6.6 What NOT to Animate

- Board column list reorder (just move, no fade)
- Comment list (new comment appears instantly, no slide-in)
- Notification badge count change (just update the number)
- Card title updates from other users (no flash/highlight — just update)

---

## 7. Component States

Every interactive element has defined visual states. The same visual language applies across all components.

### 7.1 Button States

Using shadcn `Button` variants:

| State | Visual |
|---|---|
| Default | `bg-primary text-primary-foreground` |
| Hover | `bg-primary/90` (10% opacity reduction) |
| Focus | 2px ring using `--ring` color |
| Active/pressed | `bg-primary/80` |
| Disabled | `opacity-50 cursor-not-allowed pointer-events-none` |
| Loading | Spinner icon replaces or precedes label text |

**Destructive variant** (delete actions):

| State | Visual |
|---|---|
| Default | `bg-destructive text-destructive-foreground` |
| Hover | `bg-destructive/90` |

**Ghost variant** (sidebar nav, icon buttons):

| State | Visual |
|---|---|
| Default | transparent background |
| Hover | `bg-accent text-accent-foreground` |
| Active | `bg-accent` — same as hover but persists |

### 7.2 Input States

| State | Visual |
|---|---|
| Default | `border-input bg-background` |
| Focus | `ring-2 ring-ring ring-offset-2` |
| Error | `border-destructive ring-destructive` + error message below |
| Disabled | `opacity-50 cursor-not-allowed bg-muted` |
| Read-only | `bg-muted cursor-default` (no ring on focus) |

### 7.3 Card Item States

| State | Visual |
|---|---|
| Default | `bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700` |
| Hover | `shadow-sm` — subtle elevation |
| Dragging (source) | `opacity-50` |
| Drag overlay | `rotate-1 shadow-2xl bg-white dark:bg-zinc-900` |
| Selected (modal open) | no special visual — modal opening is the feedback |

### 7.4 Column States

| State | Visual |
|---|---|
| Default | `bg-zinc-100 dark:bg-zinc-800/50 rounded-lg` |
| Drag target (card hovering over) | `bg-zinc-200 dark:bg-zinc-700/70` |
| Column header hover | drag handle icon `opacity-0 → opacity-100` |

### 7.5 Inline Edit States (ColumnHeader, AddCardInput)

| State | Visual |
|---|---|
| Display mode | plain text, cursor: pointer |
| Edit mode active | `<input>` with focus ring, full column width |
| Submitting | input disabled briefly while mutation runs |
| Cancelled (Escape) | reverts to display text |

---

## 8. Loading & Skeleton States

Every data-driven component shows a skeleton while its Convex query is loading. Never show a blank area or "Loading..." text.

### 8.1 Skeleton Patterns

**Board view (while columns load):**
```tsx
// 3 skeleton columns, each containing 2 skeleton card shapes
<div className="flex gap-4">
  {[1, 2, 3].map(i => (
    <div key={i} className="w-[280px] bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 space-y-2">
      <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
      <div className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
      <div className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
    </div>
  ))}
</div>
```

**Workspace dashboard (while boards load):**
```tsx
// Grid of 4 skeleton board cards
<div className="grid grid-cols-3 gap-4">
  {[1, 2, 3, 4].map(i => (
    <div key={i} className="h-24 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
  ))}
</div>
```

**Card modal (while card data loads):**
```tsx
// Title skeleton + description skeleton
<div className="space-y-4">
  <div className="h-6 w-1/2 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
  <div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
</div>
```

**Notification list (while loading):**
```tsx
// 3 notification row skeletons
{[1, 2, 3].map(i => (
  <div key={i} className="flex items-center gap-3 p-3">
    <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
    <div className="flex-1 space-y-1">
      <div className="h-3 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
      <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
    </div>
  </div>
))}
```

**Member list (while loading):**
```tsx
// 3 member row skeletons with avatar + name + role selector placeholder
```

### 8.2 Loading States for Actions (Mutation In-Progress)

When a user triggers a mutation (save card, create column, etc.) and is waiting for confirmation:

| Context | Behavior |
|---|---|
| Save button in card modal | Button shows spinner icon, text changes to "Saving...", disabled |
| Create column / card (inline input) | Input disabled, no spinner (optimistic update already applied) |
| Role change dropdown | Dropdown disabled, shows spinner in place of the role value |
| Delete confirmation button | Shows spinner, disabled — prevents double-click |
| Invite generation | Button disabled, spinner shown while generating |

---

## 9. Empty States

Empty states are shown when data exists (queries succeed) but the result set is empty. They guide the user toward the next action.

| Screen/Component | Empty State Content |
|---|---|
| Workspace dashboard (no boards) | Illustration or icon + "No boards yet" + "Create your first board" button |
| Board view (no columns) | "Add your first column" with arrow pointing to the Add Column button |
| Column (no cards) | "No cards" in muted text — do NOT show a button (Add Card is already at the bottom) |
| Notification list | Bell icon + "No notifications yet" |
| Activity log | "No activity recorded yet" |
| Comment thread | "No comments yet. Be the first." |
| Card history tab | "No changes recorded yet." |
| Search results | "No cards match '[query]'" |
| Member list | Should never be empty (at least the owner is always present) — omit empty state |
| Chat history | "No messages yet. Say something!" |

### Empty State Visual Pattern

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Icon className="h-10 w-10 text-muted-foreground mb-3" />
  <p className="text-sm font-medium">No boards yet</p>
  <p className="text-xs text-muted-foreground mt-1">Create a board to start organizing your work</p>
  <Button className="mt-4" size="sm">Create your first board</Button>
</div>
```

---

## 10. Error States

### 10.1 Inline Form Errors

Validation errors appear below the relevant input:
```tsx
<div className="space-y-1">
  <Input className="border-destructive" value={...} />
  <p className="text-xs text-destructive">Workspace name is required.</p>
</div>
```

### 10.2 Mutation Error Pattern

When a Convex mutation fails (network error, FORBIDDEN, validation error):

1. Any optimistic UI update is reverted
2. A toast notification appears (see section 11)
3. The form/input is returned to its pre-submission state

Do NOT show inline error text for mutation failures — use toasts. Inline errors are for form validation only (before submission).

### 10.3 Page-Level Errors

| Error | Display |
|---|---|
| Board not found (404) | "Board not found" with a link back to the workspace dashboard |
| Workspace not found (404) | "Workspace not found" with a link to the root page |
| FORBIDDEN (insufficient permission) | "You don't have access to this board" with a link back |
| Server error | "Something went wrong. Try refreshing the page." |

### 10.4 Connection Error (WebSocket Offline)

Shown as a banner, not a modal — the app remains usable in a degraded state:
```tsx
<div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-2 text-sm">
  You are offline. Reconnecting...
</div>
```

When the connection is restored, the banner disappears automatically (no user action required).

---

## 11. Toast Notifications

OnPoint uses shadcn's `toast` / `useToast` hook for all transient feedback.

### 11.1 Toast Variants

| Variant | When to Use | Duration |
|---|---|---|
| Default | Neutral information (e.g., "Invite link copied") | 3 seconds |
| Success | Positive action confirmed (e.g., "Card saved") | 3 seconds |
| Destructive | Error or rejection (e.g., "You don't have permission") | 5 seconds |
| Warning | Non-critical issues (e.g., "This card was deleted by another user") | 5 seconds |

### 11.2 Toast Copy Patterns

| Trigger | Toast Message | Variant |
|---|---|---|
| Successful board creation | "Board created" | success |
| Successful workspace creation | "Workspace created" | success |
| Invite link copied to clipboard | "Invite link copied to clipboard" | default |
| FORBIDDEN error from any mutation | "You don't have permission to do that." | destructive |
| UNAUTHENTICATED error | "Session expired. Please sign in again." | destructive |
| Card deleted by another user (modal open) | "This card was deleted by another user." | warning |
| Rate limit exceeded (WebSocket) | "You're sending too many events. Please slow down." | warning |
| Column deletion with cards | No toast — the AlertDialog provides the confirmation feedback |
| Card saved | No toast — the modal remains open, the save button returns to normal |
| Reconnected after offline | No toast — the offline banner disappears (visible feedback already) |

### 11.3 Toast Placement

Toasts appear at the **bottom-right** of the screen. They stack vertically. Maximum 3 toasts visible at once (oldest auto-dismisses when a new one arrives at the limit).

### 11.4 No Toast for Routine Actions

Do NOT show success toasts for every mutation. Only show toasts when:
- The user needs explicit confirmation of an action that cannot be undone
- Something went wrong
- A real-time event affected the user (card deleted while viewing it)

Creating a card, renaming a column, posting a comment — these are self-evident from the UI update and do not need a toast.

---

## 12. Card Labels Design System

These 6 labels are the predefined set in v1. Each has a fixed name, color, and Tailwind classes.

| Label | Color | Chip Classes (Light) | Chip Classes (Dark) |
|---|---|---|---|
| Bug | Red | `bg-red-100 text-red-700 border-red-200` | `dark:bg-red-950 dark:text-red-400 dark:border-red-800` |
| Feature | Blue | `bg-blue-100 text-blue-700 border-blue-200` | `dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800` |
| Urgent | Orange | `bg-orange-100 text-orange-700 border-orange-200` | `dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800` |
| Design | Purple | `bg-purple-100 text-purple-700 border-purple-200` | `dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800` |
| Blocked | Gray | `bg-zinc-100 text-zinc-700 border-zinc-300` | `dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-600` |
| Done | Green | `bg-green-100 text-green-700 border-green-200` | `dark:bg-green-950 dark:text-green-400 dark:border-green-800` |

**Label chip anatomy:**
```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
  bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
  Bug
</span>
```

**Label chip in CardItem (color dot only — no text):**
For space efficiency on the card preview, labels are shown as 8px colored dots, not full chips:
```tsx
<span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" title="Bug" />
```

**In LabelPicker (full chip with text):** Use the full chip format above.

---

## 13. Accessibility Standards

OnPoint targets **WCAG 2.1 Level AA** compliance. The following rules apply to every component.

### 13.1 Keyboard Navigation

| Interaction | Keyboard Support |
|---|---|
| Tab order | Logical left-to-right, top-to-bottom. Modals trap focus while open. |
| Card modal | `Escape` closes the dialog |
| Inline editing (ColumnHeader) | `Enter` saves, `Escape` cancels |
| Add card input | `Enter` submits, `Escape` collapses |
| Add column input | `Enter` submits, `Escape` collapses |
| Dropdown menus | Arrow keys navigate options, `Enter` selects, `Escape` closes |
| Card deletion | Confirmation AlertDialog must be keyboard-navigable |
| @mention dropdown | Arrow keys navigate, `Enter` selects, `Escape` closes |

### 13.2 ARIA Labels

Every icon-only button must have an `aria-label`:
```tsx
// Correct:
<Button variant="ghost" size="icon" aria-label="Delete column">
  <Trash2Icon className="h-4 w-4" />
</Button>

// Wrong: no aria-label on an icon button
<Button variant="ghost" size="icon">
  <Trash2Icon className="h-4 w-4" />
</Button>
```

Key ARIA labels required:

| Component | aria-label |
|---|---|
| Delete column button | "Delete column" |
| Delete card button | "Delete card" |
| Drag handle | "Drag to reorder" |
| Notification bell | "Notifications" or "Notifications, N unread" |
| Dark mode toggle | "Switch to dark mode" / "Switch to light mode" |
| Close modal button | "Close" |
| Board settings link | "Board settings" |
| User menu trigger | "User menu" |
| Chat toggle button | "Open chat" / "Close chat" |
| Activity log toggle | "Open activity log" / "Close activity log" |

### 13.3 Focus Management

| Scenario | Expected Behavior |
|---|---|
| Modal opens | Focus moves to the first focusable element inside the modal |
| Modal closes | Focus returns to the element that triggered the modal (the card) |
| Toast appears | Focus is NOT moved to the toast (toasts are not focus-traps) |
| Inline edit activates | Focus moves to the `<input>` field |
| Inline edit dismisses | Focus returns to the display text element |
| AlertDialog opens | Focus moves to the "Cancel" button (safer default) |

### 13.4 Color Contrast

All text must meet WCAG AA contrast ratios:
- Normal text (< 18px): minimum 4.5:1 contrast ratio
- Large text (≥ 18px or 14px bold): minimum 3:1 contrast ratio
- The shadcn Zinc palette is chosen specifically for sufficient contrast in both modes

**Specific checks:**
- `text-muted-foreground` on `bg-background`: verify contrast in both modes
- Label chips: verify text color on chip background color (especially the Gray/Blocked label)
- Card title on column background: verify in dark mode

### 13.5 Screen Reader Considerations

| Component | SR Notes |
|---|---|
| Presence bar avatars | Each avatar has `alt` text: "[Name] is online" |
| Label color dots (CardItem) | Each dot has `title` or `aria-label` with the label name |
| Unread notification badge | `aria-label="N unread notifications"` on the badge |
| Typing indicator | Wrapped in `aria-live="polite"` so SR announces it |
| Offline banner | `role="alert"` so SR immediately announces it |
| Card drag handle | `aria-describedby` pointing to instructions text |

### 13.6 Drag-and-Drop Accessibility

dnd-kit has a `KeyboardSensor` that enables keyboard-based drag-and-drop. It must be configured:

```tsx
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
)
```

Keyboard DnD behavior:
- `Space` or `Enter` on drag handle: picks up the item
- Arrow keys: moves the item in the corresponding direction
- `Space` or `Enter` again: drops the item
- `Escape`: cancels the drag

An `aria-describedby` on every drag handle must point to off-screen instructions text:
```html
<span id="dnd-instructions" className="sr-only">
  Press space or enter to pick up this item. Use arrow keys to move it. Press space or enter to drop it. Press Escape to cancel.
</span>
```

---

## 14. Responsive Breakpoints

OnPoint uses Tailwind's standard breakpoints:

| Breakpoint | Min-width | Target Device |
|---|---|---|
| (default) | 0px | Mobile (up to 639px) |
| `sm:` | 640px | Large mobile / small tablet |
| `md:` | 768px | Tablet — layout switches from mobile to desktop |
| `lg:` | 1024px | Laptop |
| `xl:` | 1280px | Desktop |
| `2xl:` | 1536px | Large desktop |

### 14.1 Layout Behavior by Breakpoint

**Below `md` (mobile — < 768px):**
- Sidebar is hidden, accessible via hamburger → Sheet overlay
- Board switches from horizontal scroll to column tab navigation
- Card modal is full-screen bottom sheet (`rounded-t-2xl`)
- Chat panel is a floating action button (FAB) at bottom-right
- Activity log panel is full-screen when open

**`md` and above (tablet/desktop — ≥ 768px):**
- Sidebar is always visible (`w-60 flex-shrink-0`)
- Board shows horizontal scrollable column list
- Card modal is a centered dialog (`max-w-2xl`)
- Chat panel is a fixed-width right panel (`w-80`)
- Activity log panel slides in from the right (`w-96`)

### 14.2 Breakpoint Application Pattern

Use Tailwind's mobile-first approach:
```tsx
// Correct: mobile styles first, then override for larger screens
<div className="flex md:hidden">  {/* mobile only */}
<div className="hidden md:flex">  {/* desktop only */}
```

### 14.3 Touch Targets

On mobile, every interactive element must have a minimum touch target of **44x44px**:
- Icon buttons: add `min-h-11 min-w-11` if the visual size is smaller
- List items (notification items, member rows): `min-h-11`
- Tab items (column tabs): `min-h-11`

---

## 15. Icon System

OnPoint uses **Lucide React** icons (`lucide-react` package — installed as a dependency of shadcn/ui).

### 15.1 Standard Icon Size

| Context | Size Class | Pixels |
|---|---|---|
| Inline with text (nav, menu items) | `h-4 w-4` | 16px |
| Button icons | `h-4 w-4` | 16px |
| Empty state illustrations | `h-10 w-10` | 40px |
| Notification type icons | `h-4 w-4` | 16px |

### 15.2 Icon Assignments

| UI Element | Icon | Lucide Name |
|---|---|---|
| Drag handle | 6-dot grid | `GripVertical` |
| Delete | Trash | `Trash2` |
| Edit / pencil | Pencil | `Pencil` |
| Add / create | Plus | `Plus` |
| Settings / gear | Settings | `Settings` |
| Close / dismiss | X | `X` |
| Dark mode (moon) | Moon | `Moon` |
| Light mode (sun) | Sun | `Sun` |
| Notifications bell | Bell | `Bell` |
| Chat / messages | Message | `MessageSquare` |
| Activity log | List | `ListIcon` |
| Copy | Copy | `Copy` |
| Chevron right | ChevronRight | `ChevronRight` |
| Check | Check | `Check` |
| Board | Layout | `LayoutDashboard` |
| Workspace | Building | `Building2` |
| Assigned (notification) | User | `UserIcon` |
| Mentioned (notification) | At sign | `AtSign` |
| Calendar / due date | Calendar | `CalendarIcon` |
| Label | Tag | `TagIcon` |
| User avatar fallback | User circle | `UserCircle` |
| Expand / open detail | External link | `ExternalLink` |
| Hamburger menu (mobile) | Menu | `Menu` |
| Online presence | Circle (filled) | CSS `bg-green-500` dot |

---

## 16. Component-by-Component Specifications

Detailed visual and interaction specs for the most complex components.

### 16.1 CardItem

```
┌─────────────────────────────────┐
│ [⠿] drag handle (shows on hover)│
│ Card Title Here (truncated)      │
│                                  │
│ [● Bug] [● Urgent]               │  ← 8px colored dots
│ [👤 Avatar] [📅 Jan 15]          │  ← assignee + due date
└─────────────────────────────────┘
```

- Width: full column width minus column padding
- Min height: 64px
- Background: `bg-white dark:bg-zinc-900`
- Border: `border border-zinc-200 dark:border-zinc-700`
- Hover: `shadow-sm cursor-pointer`
- Drag handle: `opacity-0 group-hover:opacity-100` (use `group` on the card wrapper)
- Title: `text-sm font-medium truncate`
- Label dots: `flex flex-wrap gap-1 mt-1`
- Footer row: `flex items-center justify-between mt-2`
- Assignee avatar: `h-5 w-5 rounded-full` (tiny avatar chip)
- Due date: `text-xs` — red if past, muted-foreground if future

### 16.2 Column

```
┌──────────────── To Do ──── [⋮] ┐
│                           [N]   │  ← card count badge
│ ┌─────────────────────────────┐ │
│ │ Card 1                       │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Card 2                       │ │
│ └─────────────────────────────┘ │
│                                  │
│ + Add a card                     │  ← muted, expands on click
└──────────────────────────────────┘
```

- Width: 280px fixed, `min-w-[280px]`
- Background: `bg-zinc-100 dark:bg-zinc-800/50`
- Header: `flex items-center justify-between p-3 pb-2`
- Column title: `text-sm font-semibold flex-1 truncate cursor-pointer`
- Card count badge: `text-xs text-muted-foreground bg-zinc-200 dark:bg-zinc-700 rounded-full px-1.5`
- Card list: `space-y-2 px-3 min-h-[8px]` (min-height prevents zero-height drop zone)
- Add Card area: `px-3 pb-3 pt-1`

### 16.3 Presence Bar

```
[👤 A] [👤 B] [👤 C] [👤 D] [👤 E] +3
```

- Each avatar: `h-8 w-8 rounded-full border-2 border-background -ml-2 first:ml-0`
- The negative margin creates the overlapping effect
- Tooltip on hover: shadcn Tooltip with the user's display name
- Online dot: `h-2 w-2 bg-green-500 rounded-full absolute bottom-0 right-0 border border-background`
- Overflow badge: `h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-medium flex items-center justify-center`

### 16.4 Board Header

```
[← Workspace Name]  Board Title                          [👤 A][👤 B]  [🔔3]  [💬]  [📋]  [⚙️]
```

- Height: `h-14`
- Background: `bg-background border-b border-border`
- Sticky: `sticky top-0 z-10`
- Layout: `flex items-center px-6 gap-4`
- Board title: `text-xl font-semibold flex-1`
- Right side: `flex items-center gap-2 ml-auto`

### 16.5 Notification Bell

- Bell icon with unread badge
- Badge: `absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center`
- Hidden when count is 0: `{count > 0 && <span>...</span>}`
- Popover opens on click: contains `NotificationList` component
- Popover width: `w-96`
- Max height: `max-h-[480px] overflow-y-auto`

### 16.6 ActivityLogPanel & ChatPanel

Both panels are sliding panels that overlay the board from the right:

```
Board (full width)  [Chat Panel: 320px]
```

- Panel position: `fixed right-0 top-14 bottom-0 z-30`
- Open: `translate-x-0`
- Closed: `translate-x-full`
- Transition: `transition-transform duration-200 ease-out`
- Background: `bg-background border-l border-border`
- Width: Chat = `w-80`, Activity log = `w-96`
- When open, the board view does NOT shrink — panels overlay the board (acceptable UX at this scale)

### 16.7 Tiptap Editor Toolbar

Shown in the card description editor (edit mode only — hidden in read mode):

```
[B] [I] [<>] [•] [1.]  ─────────── [Save] [Cancel]
```

- Container: `border border-input rounded-t-md px-2 py-1 flex items-center gap-1 bg-muted`
- Toolbar buttons: `h-7 w-7 rounded hover:bg-accent` — icon-only buttons
- Active state (bold is on): `bg-accent text-accent-foreground`
- Save/Cancel buttons: right-aligned below the editor, not in the toolbar

### 16.8 Mobile Column Tab Bar

When viewport < 768px:

```
[ Backlog (3) ] [ In Progress (1) ] [ Done (2) ] [ Review ]
← scrollable horizontally →
```

- Container: `flex overflow-x-auto gap-1 px-4 py-2 border-b border-border`
- Each tab: `flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium`
- Active tab: `bg-primary text-primary-foreground`
- Inactive tab: `bg-transparent text-muted-foreground hover:bg-accent`
- Card count: `ml-1 text-xs opacity-70`
- Selected column renders its full `Column` component below the tab bar

### 16.9 AppSidebar

```
┌──────────────────────┐
│  ● OnPoint  logo     │
├──────────────────────┤
│  WORKSPACES          │
│  > Acme Team         │
│  > Freelance         │
│  + New Workspace     │
├──────────────────────┤
│  [current workspace] │
│  📋 Dashboard        │
│  ─────────────────── │
│  BOARDS              │
│  📌 Sprint Board     │
│  📌 Marketing        │
│  + New Board         │
└──────────────────────┘
```

- Width: `w-64`, fixed position on desktop
- Background: `bg-zinc-900 dark:bg-zinc-950` (sidebar is always dark regardless of theme)
- Text: `text-zinc-100`
- Logo area: `flex items-center gap-2 px-4 py-5 border-b border-zinc-700`
- Section headers: `text-[11px] font-semibold uppercase tracking-wider text-zinc-500 px-4 pt-4 pb-1`
- Nav items: `flex items-center gap-2 px-4 py-2 rounded-md mx-2 text-sm text-zinc-300 hover:bg-zinc-800 cursor-pointer`
- Active nav item: `bg-zinc-800 text-white font-medium`
- Workspace selector: Clicking the workspace name expands the list — `Collapsible` from shadcn/ui
- "New Board" button: `text-zinc-400 hover:text-white` dashed border style — `border border-dashed border-zinc-700`
- On mobile: sidebar is hidden; a hamburger button in the top-left opens it as a sheet (`Sheet` from shadcn/ui, `side="left"`)

### 16.10 UserMenu

```
[👤 Avatar] ▾
```
When clicked, opens a Popover/DropdownMenu:
```
┌──────────────────────┐
│  Sushri Swain        │
│  sushri@example.com  │
├──────────────────────┤
│  Profile             │
│  Settings            │
├──────────────────────┤
│  🌙 Dark Mode toggle │
├──────────────────────┤
│  Sign Out            │
└──────────────────────┘
```

- Trigger: `Avatar` component from shadcn/ui — `h-8 w-8 rounded-full`
- Dropdown: `DropdownMenu` from shadcn/ui
- User info block at top: non-clickable, name in `text-sm font-medium`, email in `text-xs text-muted-foreground`
- Separator between sections: `DropdownMenuSeparator`
- Dark mode toggle row: renders a `Switch` inline — `flex items-center justify-between`
- Sign Out: `text-red-500 focus:text-red-500` — visually distinct from non-destructive items
- Positioned: bottom-right of the sidebar, `sticky bottom-0 p-3 border-t border-zinc-700`

### 16.11 CardModal

The most complex component. Renders as a `Dialog` from shadcn/ui overlaid on the board.

```
┌─────────────────────────────────────────────────────┐
│  [Card Title — editable inline]              [X]    │
│  in column: Doing                                    │
├──────────────────────────────────────────────────────┤
│  [ Details ] [ History ]   ← shadcn Tabs            │
├──────────────────────────────────────────────────────┤
│  DESCRIPTION                                         │
│  ┌────────────────────────────────────────────────┐  │
│  │ [B][I][<>][•][1.] │ Tiptap toolbar             │  │
│  │ ─────────────────────────────────────────────  │  │
│  │ Card description text here…                    │  │
│  └────────────────────────────────────────────────┘  │
│  [Save] [Cancel]                                     │
│                                                      │
│  ASSIGNEE          LABELS           DUE DATE         │
│  [👤 Assign ▾]   [🏷 Labels ▾]    [📅 Set date ▾]  │
│                                                      │
│  COMMENTS                                            │
│  ┌────────────────────────────────────────────────┐  │
│  │ [👤] Write a comment…  (Tiptap, no toolbar)   │  │
│  │     [Submit]                                   │  │
│  └────────────────────────────────────────────────┘  │
│  ─── Existing comments (CommentThread) ───           │
│                                                      │
│  [🗑 Delete Card]           (bottom, red)            │
└──────────────────────────────────────────────────────┘
```

**Dialog dimensions:**
- Width: `max-w-2xl w-full` (672px)
- Height: `max-h-[90vh] overflow-y-auto`

**Title block:**
- Inline editable: clicking title replaces it with `<input>`, saves on blur or Enter
- Font: `text-xl font-semibold`
- Column breadcrumb below: `text-sm text-muted-foreground` — "in [column name]"

**Tabs:**
- `Tabs defaultValue="details"` — Details and History
- Tab list: `border-b border-border mb-4`

**Description section:**
- Section label: `text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1`
- Tiptap editor in edit mode shows toolbar + bordered editor area
- In read mode (not focused): text renders as prose, click to enter edit mode
- Placeholder: `"Add a description…"` in muted color

**Metadata row (Assignee, Labels, Due Date):**
- Layout: `flex items-center gap-4 flex-wrap py-3 border-t border-b border-border my-4`
- Each picker: label above (`text-xs text-muted-foreground`), control below

**Comments section:**
- `CommentThread` component renders below the metadata row
- New comment input is always visible at the top of the thread (above existing comments)

**Delete button:**
- Positioned at bottom of dialog, full-width: `w-full mt-4`
- Variant: `variant="destructive"` (red)
- Clicking opens an `AlertDialog` confirmation: "Are you sure? This card and all its comments will be permanently deleted."

**History tab:**
- List of `cardHistory` entries from Convex: `useQuery(api.cards.getHistory, { cardId })`
- Each entry: `text-sm` — "[Actor] changed [field] from '[prev]' to '[new]' · [relative time]"
- Read-only, no interactions

### 16.12 CommentThread

```
[👤] [Write a comment…]  ← CommentInput at top
─────────────────────────
[👤] Sushri · 2 hours ago   [✏️] [🗑]
     "This needs review @Punit"
─────────────────────────
[👤] Punit · 1 hour ago
     "On it!"
```

- Container: `space-y-4`
- New comment input always at top of the thread list
- Comments rendered in reverse-chronological order (newest first) or chronological — choose one and be consistent; use **chronological** (oldest first, new at top as input)
- Edit/delete icons: `opacity-0 group-hover:opacity-100` — only visible on hover of the comment row
- Edit/Delete only shown to comment author (via `currentUserId === comment.authorId`)
- Admin/board edit-permission users can delete any comment (delete icon always visible to them)

### 16.13 CommentItem

```
[👤 avatar]   Sushri  ·  2 hours ago    [✏️][🗑]
              "Comment body rendered as Tiptap HTML"
              (edited)  ← shown if editedAt exists
```

- Layout: `flex gap-3`
- Avatar: `h-7 w-7 rounded-full flex-shrink-0`
- Author name: `text-sm font-medium`
- Timestamp: `text-xs text-muted-foreground ml-1` — use `dayjs().fromNow()`
- Body: rendered as read-only Tiptap viewer (not editable unless in edit mode)
- `(edited)` tag: `text-xs text-muted-foreground italic ml-1`
- In edit mode: body replaced by Tiptap editor with Save/Cancel below
- @mention highlights in body: `text-primary font-medium` (styled in Tiptap's mention extension)

### 16.14 WorkspaceDashboard

```
┌──────────────────────────────────────────────┐
│  Acme Team                         [+ New Board] │
│  3 boards                                    │
├──────────────────────────────────────────────┤
│  [BoardCard]  [BoardCard]  [BoardCard]        │
│  [BoardCard]  [BoardCard]                    │
└──────────────────────────────────────────────┘
```

- Page header: `flex items-center justify-between mb-6`
- Workspace name: `text-2xl font-bold`
- Board count: `text-sm text-muted-foreground`
- Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`
- "New Board" button: primary button, top-right of header
- Empty state (no boards): centered illustration + "Create your first board" button

### 16.15 BoardCard

```
┌──────────────────────┐
│  📌 Sprint Board     │
│  🔒 Private          │
│                      │
│  Updated 2h ago      │
└──────────────────────┘
```

- Card: `rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer`
- Board name: `text-base font-semibold truncate`
- Visibility badge: `text-xs px-1.5 py-0.5 rounded-full`
  - Private: `bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300`
  - Workspace: `bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300`
- Last updated: `text-xs text-muted-foreground mt-3`
- Hover: `hover:border-primary/50` — subtle border highlight

### 16.16 CreateBoardDialog

```
Create a New Board
──────────────────
Board Name *
[                  ]

Visibility
◉ Workspace  Everyone in workspace can see
○ Private    Only invited members

          [Cancel]  [Create Board]
```

- Triggered by "New Board" button on WorkspaceDashboard
- `Dialog` from shadcn/ui, `max-w-sm`
- Board name: `Input` with label, required, max 50 characters
- Visibility: `RadioGroup` with two options — description text below each
- Submit disabled while Convex mutation is loading: `isPending` state
- On success: dialog closes, board grid auto-updates via Convex reactive query

### 16.17 MembersList

```
Name              Email                   Role        Action
────────────────────────────────────────────────────────────
[👤] Sushri       sushri@example.com     Owner       —
[👤] Punit        punit@example.com      Admin ▾    [Remove]
[👤] Alex         alex@example.com       Member ▾   [Remove]
```

- Container: `rounded-lg border border-border overflow-hidden`
- Table header: `bg-muted/50 text-xs font-medium text-muted-foreground uppercase`
- Each row: `flex items-center gap-4 px-4 py-3 border-b border-border last:border-0`
- Avatar: `h-8 w-8 rounded-full`
- Name + email: `flex flex-col` — name `text-sm font-medium`, email `text-xs text-muted-foreground`
- Role selector: `Select` from shadcn/ui — disabled for Owner row (cannot change owner's role)
- Remove button: `variant="ghost" size="sm" text-red-500` — hidden for Owner row
- Owner cannot be removed — the row's action column shows "—"

### 16.18 InviteMemberDialog

```
Invite Members
──────────────
Email address
[                     ] [Send Invite]

Or share this link:
[https://onpoint.app/invite/abc123  ] [Copy]

          [Close]
```

- `Dialog`, `max-w-md`
- Email input: `Input` + `Button` inline, `flex gap-2`
- On send: calls `inviteMember` Convex mutation, shows inline success: "Invite sent to email@example.com"
- Invite link section: `Input` with `readOnly` + copy button (Clipboard API)
- Copy button shows "Copied!" for 2 seconds after click: uses `useState` timeout
- Error case (email already a member): `text-destructive text-sm mt-1` below input

### 16.19 NotificationItem

```
[👤]  Sushri assigned you to "Fix auth bug"      [●]
      Sprint Board · 5 minutes ago
```

```
[👤]  Punit mentioned you in "Release notes"     [●]
      Marketing Board · 1 hour ago
```

- Layout: `flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer`
- Unread indicator: `h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5` — hidden if `isRead`
- Read state: `opacity-60` on entire row if `isRead`
- Avatar: `h-8 w-8 rounded-full flex-shrink-0`
- Content: `flex flex-col gap-0.5`
  - Primary text: `text-sm` — "Sushri assigned you to [card title]"
  - Secondary: `text-xs text-muted-foreground` — "[Board name] · [relative time]"
- Clicking: marks as read (Convex mutation) + navigates to the board (no deep-link to card in v1)

### 16.20 NotificationList

```
┌────────────────────────────────────────┐
│  Notifications          [Mark all read] │
├────────────────────────────────────────┤
│  [NotificationItem]                    │
│  [NotificationItem]                    │
│  [NotificationItem]                    │
├────────────────────────────────────────┤
│  (empty state if no notifications)     │
└────────────────────────────────────────┘
```

- Rendered inside `NotificationBell`'s Popover
- Header: `flex items-center justify-between px-4 py-3 border-b border-border`
- Title: `text-sm font-semibold`
- "Mark all read" button: `variant="ghost" size="sm"` — disabled if no unread
- List: `max-h-[420px] overflow-y-auto`
- Empty state: `text-center text-sm text-muted-foreground py-8` — "No notifications yet"

### 16.21 ChatMessage

```
[👤]  Sushri        10:42 AM
      "Has anyone reviewed the PR?"
```

```
     ← right-aligned if current user →
                    10:43 AM  Sushri [👤]
              "Just approved it 🎉"
```

- Other users' messages: left-aligned (`flex-row`)
- Current user's messages: right-aligned (`flex-row-reverse`)
- Bubble: `rounded-2xl px-3 py-2 max-w-[75%] text-sm`
  - Other user: `bg-muted`
  - Current user: `bg-primary text-primary-foreground`
- Avatar: `h-7 w-7 rounded-full flex-shrink-0`
- Timestamp: `text-[10px] text-muted-foreground` — shown once per message group (consecutive messages from same user within 1 minute collapse timestamps)

### 16.22 ChatInput

```
[  Type a message…                              ] [➤ Send]
Sushri is typing…
```

- Container: `border-t border-border p-3`
- Input: `Input` component, full-width, max 2000 characters
- Send button: icon button (`SendHorizontal` icon), `variant="default"`
- Pressing Enter submits (does NOT add newline — chat is single-line)
- Shift+Enter: not supported in v1 (single-line only)
- Typing indicator: `text-xs text-muted-foreground italic mt-1` — visible below input, hidden when empty
- Send is disabled while `body.trim() === ""`

### 16.23 AssigneePicker

```
[👤 Assign ▾]
```
Opens a `Popover + Command`:
```
┌──────────────────────────┐
│  🔍 Search members…      │
├──────────────────────────┤
│  [👤] Sushri             │
│  [👤] Punit    ✓         │  ← ✓ = currently assigned
│  [👤] Alex               │
└──────────────────────────┘
```

- Trigger button: shows current assignee's avatar + name if assigned; "Assign" if unassigned
- `Command` from shadcn/ui provides fuzzy search
- Selecting a user: calls `updateCard({ assigneeId })` Convex mutation
- Selecting the already-assigned user: unassigns (sets `assigneeId` to `null`)
- `unassign` option at top: "No assignee" with an `X` icon

### 16.24 LabelPicker

```
[🏷 Labels ▾]
```
Opens a `Popover`:
```
┌──────────────────────────────┐
│  [● Bug]  [● Feature]        │
│  [● Urgent]  [● Design]      │
│  [● QA]  [● Docs]            │
└──────────────────────────────┘
```

- 6 predefined labels (see Section 12 for colors)
- Each label: pill button, `rounded-full px-3 py-1 text-xs font-medium`
- Selected label: `ring-2 ring-offset-1 ring-primary` or solid fill
- Selecting/deselecting: calls `setCardLabels` Convex mutation (sends full updated array)
- Multiple labels can be active simultaneously

### 16.25 DeleteColumnDialog

```
Delete "Doing"?
────────────────────────────────────────────
This column contains 4 cards. Deleting this
column will permanently delete all cards
inside it. This action cannot be undone.

                  [Cancel]  [Delete Column]
```

- `AlertDialog` from shadcn/ui (not a regular Dialog — prevents accidental dismissal)
- Triggered by column delete button in `ColumnHeader`
- Body text dynamically shows card count: `"This column contains ${cardCount} cards."` — if `cardCount === 0`, shows "This column is empty."
- Confirm button: `variant="destructive"` — "Delete Column"
- On confirm: calls `deleteColumn` Convex mutation

### 16.26 AddCardInput

```
[+ Add a card            ]
```
Expanded state:
```
[                         ]  ← input
[Add Card]  [✕]
```

- Default (collapsed): a `"+ Add a card"` text button — `text-sm text-muted-foreground hover:text-foreground`
- Expanded: shows `Input` + two buttons (`"Add Card"` and `✕` cancel)
- Clicking `"+ Add a card"` expands the input and auto-focuses it
- Pressing Enter in the input submits (calls `createCard`)
- Pressing Escape cancels
- After submit: input clears and stays expanded to allow rapid card creation (user clicks ✕ to close)
- Positioned: at the bottom of the column card list, inside the `Column` component

---

## 17. Page Layout Specifications

### 17.1 Root Layout (all pages)

```html
<html lang="en" class="h-full">
  <body class="h-full bg-background text-foreground font-sans antialiased">
    {children}
  </body>
</html>
```

- `font-sans` → Inter via `next/font/google`
- `antialiased` → smooth font rendering
- `bg-background` → resolves to white (light) or `zinc-950` (dark) via CSS var

### 17.2 Auth Pages (`/sign-in`, `/sign-up`)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│          ● OnPoint                               │
│                                                  │
│     ┌──────────────────────────────────┐         │
│     │       [Clerk SignIn embed]       │         │
│     └──────────────────────────────────┘         │
│                                                  │
└──────────────────────────────────────────────────┘
```

- Full viewport: `min-h-screen flex flex-col items-center justify-center`
- Background: `bg-zinc-50 dark:bg-zinc-950`
- Logo above Clerk component: `mb-8 text-2xl font-bold`
- Clerk component centered with `mx-auto`

### 17.3 Onboarding Page (`/onboarding`)

```
┌──────────────────────────────────────────────────┐
│  ● OnPoint                                       │
├──────────────────────────────────────────────────┤
│                                                  │
│        Welcome to OnPoint!                       │
│        Let's get you set up.                     │
│                                                  │
│  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  Create a        │  │  Join an existing    │  │
│  │  workspace       │  │  workspace           │  │
│  │  [Name input]    │  │  [Invite link input] │  │
│  │  [Create →]      │  │  [Join →]            │  │
│  └──────────────────┘  └──────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

- Centered content: `max-w-2xl mx-auto py-16 px-4`
- Two cards side-by-side on desktop, stacked on mobile: `grid grid-cols-1 md:grid-cols-2 gap-6`
- Each option card: `rounded-xl border-2 border-border p-6 hover:border-primary/50 cursor-pointer`

### 17.4 App Shell (all authenticated pages)

```
┌─────────────┬─────────────────────────────────────────────┐
│             │  [Header / breadcrumb / actions]            │
│  AppSidebar │  ─────────────────────────────────────────  │
│  (w-64)     │                                             │
│             │     [Page content]                          │
│             │                                             │
│             │                                             │
└─────────────┴─────────────────────────────────────────────┘
```

- Layout: `flex h-screen overflow-hidden`
- Sidebar: `w-64 flex-shrink-0 h-full overflow-y-auto`
- Main area: `flex-1 flex flex-col overflow-hidden`
- Top bar (inside main): `h-14 border-b border-border flex items-center px-6`
- Content area: `flex-1 overflow-y-auto p-6` (except Board View — see below)

### 17.5 Workspace Dashboard Layout

- Content area padding: `p-6`
- Max width: `max-w-7xl mx-auto`
- Header row (workspace name + New Board button): `flex items-center justify-between mb-8`

### 17.6 Board View Layout

The board view has special layout constraints because the Kanban area must scroll horizontally:

```
┌─────────────────────────────────────────────────────────────┐
│  BoardHeader (h-14, sticky, border-b)                       │
├─────────────────────────────────────────────────────────────┤
│  PresenceBar (h-10, px-6)                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ← Horizontal scroll →                                      │
│  [Column] [Column] [Column] [+ Add Column]                  │
│                                                             │
│                                           [ChatPanel 320px] │
└─────────────────────────────────────────────────────────────┘
```

- Board page wrapper: `flex flex-col h-full overflow-hidden`
- Kanban scroll container: `flex-1 flex overflow-x-auto overflow-y-hidden gap-3 p-4 pb-0`
- Each column is `flex-shrink-0 w-[280px]`
- Chat panel: `fixed right-0 top-14 bottom-0` — overlays the board when open
- No padding-right compensation when chat opens (panel overlays, does not push)

### 17.7 Settings Pages Layout

- `max-w-2xl mx-auto py-8 px-4 space-y-8`
- Section headers: `text-lg font-semibold border-b border-border pb-2`
- Action area (save/delete buttons): at the bottom of each section

---

## 18. Form Design Patterns

### 18.1 Input Labels

All form inputs use a label above (not inline placeholder-only):

```
Board Name *
[                    ]
Board name must be between 1 and 50 characters.  ← error
```

- Label: `text-sm font-medium mb-1.5 block`
- Required indicator: `text-destructive` asterisk after label
- Error message: `text-sm text-destructive mt-1`
- Helper text (non-error): `text-sm text-muted-foreground mt-1`

### 18.2 Inline Edit Pattern

Used for: board name, column title, card title (clickable text that becomes an input on click).

```
Sprint Board   ← normal state, looks like text
[Sprint Board] ← edit state, looks like an input
```

- Normal state: `cursor-pointer hover:underline hover:decoration-dashed`
- Edit state: `Input` component with same font sizing as the text it replaced
- Save triggers: blur OR Enter key
- Cancel triggers: Escape key — reverts to original value
- While saving (Convex mutation in flight): input stays disabled, shows spinner in place of save icon

### 18.3 Confirmation Dialog Pattern

Used for: delete card, delete column, delete board, remove member.

```
[AlertDialog]
Title: "Delete [thing name]?"
Body: consequence description
Footer: [Cancel] [Confirm (destructive)]
```

- Always use `AlertDialog` (not `Dialog`) for destructive actions
- Confirm button: `variant="destructive"`
- Confirm button text: specific ("Delete Card", "Delete Column") — never generic "OK" or "Confirm"
- Cancel button: `variant="outline"`

### 18.4 Loading & Disabled States

- While a mutation is in flight: the submit button shows `disabled` + spinner (`Loader2` icon with `animate-spin`)
- Form inputs are also `disabled` during the mutation (prevents double-submit)
- On error: button re-enables, error toast appears, form data is preserved

### 18.5 Submit on Enter

- Single-field dialogs (create board, create workspace, rename column): Enter submits
- Multi-field forms (card modal, settings): Enter does NOT submit globally — only submits if focus is on a non-textarea field
- Textarea / Tiptap editor fields: Enter adds a newline, never submits

### 18.6 Character Limits

| Field | Max Characters |
|---|---|
| Workspace name | 50 |
| Board name | 50 |
| Column title | 50 |
| Card title | 200 |
| Card description | Tiptap JSON, effectively unlimited |
| Comment body | Tiptap JSON, effectively unlimited |
| Chat message | 2000 |
| Email invite field | Standard email max (254) |

### 18.7 Empty & Placeholder Text

| Context | Placeholder / Empty Text |
|---|---|
| Card title input | "Card title…" |
| Column title input | "Column name…" |
| Workspace name input | "e.g. Acme Team" |
| Board name input | "e.g. Sprint Board" |
| Comment input | "Write a comment… Use @ to mention" |
| Chat input | "Message the team…" |
| Card description (Tiptap) | "Add a description… " |
| Search (Command) | "Search members…" |
