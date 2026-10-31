# BetterYou Design System

The single source of truth for how BetterYou's portal UI looks and behaves.
**Every new screen or component must be built from what's here.** If something
you need isn't covered, extend this system (token → primitive → doc) rather than
styling one-off in a page.

Direction: **calm, clinical, Apple-inspired.** Hierarchy comes from surface
contrast, type and spacing — not from borders, gradients, glass or decoration.
Motion is quick, physical and interruptible, and always optional.

---

## 1. Principles

1. **Clinical facts first.** Allergies, condition, status and the next action
   must be findable in one glance. Flag safety-relevant data (allergies) with the
   warning tone and an icon — never color alone.
2. **One primary action per view.** Everything else is secondary, tertiary or
   ghost. Destructive actions are quiet, separated (left side of a footer) and
   always confirmed.
3. **Surfaces, not boxes.** White cards on a grey canvas separate themselves.
   Don't nest bordered cards; group inside one card with spacing or a divider.
4. **Say it once.** The page title lives in the topbar (practitioner shell) —
   don't repeat it in the content, and don't add page subtitles. No redundant
   headings or wrappers.
5. **Solid chrome.** Topbar, sidebar and bottom nav are solid `bg-bg-card`.
   No translucent/blurred bars. (Blur is allowed only on modal scrims.)
6. **Tokens only.** Colors, radii, shadows and type come from tokens. Never
   hard-code hex values or Tailwind palette colors (`text-emerald-600`,
   `bg-blue-50`, …) in product UI.

---

## 2. Tokens

Defined as CSS variables in `src/app/globals.css` (light, `.dark`, `.theme-mono`)
and exposed as Tailwind classes in `tailwind.config.ts`. The accent (`--primary`)
can be changed at runtime by the user, so **always go through the tokens**.

### Color

| Role | Classes | Use for |
| --- | --- | --- |
| Canvas | `bg-bg-page` | The app background behind cards |
| Surface | `bg-bg-card` | Cards, dialogs, menus, chrome |
| Recessed | `bg-bg-subtle` | Panels inside a card, side rails, dialog footers, disabled inputs |
| Hover | `bg-bg-hover` | Hover fill on rows/ghost buttons; neutral chips |
| Text | `text-text-primary` / `text-text-secondary` / `text-text-light` | Body / supporting / placeholder & "Not recorded" |
| Border | `border-border` / `border-border-light` | Control & card edges / inner dividers |
| Accent | `bg-primary` (hover `-hover`, active `-pressed`), `bg-primary/10`, `bg-primary-subtle`, `text-primary-strong` | Primary buttons & indicators / tints / faintest wash / accent **text** |
| Info | `bg-info-light text-info-strong`, `bg-info` | Informational states — never the brand blue, so info ≠ "action" |
| Featured | `bg-brand` + `shadow-brand` (white text), `bg-brand-soft` | Gradients — see the rules below |
| Status fills | `bg-success`, `bg-warning`, `bg-danger`, `bg-teal`, `bg-purple` (+ `-light`) | Dots, bars, solid fills, badge backgrounds |
| Status text | `text-success-strong`, `text-warning-strong`, `text-danger-strong`, `text-teal-strong`, `text-purple-strong` | Any status-colored **text or icon** |

Brand blue is `#2563eb` (white label contrast 5.2:1). The old `#5b8def`
failed AA for button labels (3.2:1); saved copies of it migrate automatically.

**Gradients — selective, never decorative:**
- `bg-brand` (deep blue, white text): at most **one hero per view** — e.g. the
  dashboard's "Today's appointments" stat (`<StatCard featured>`), a
  `<Card variant="featured">`. Buttons on it use `variant="on-brand"`.
- `bg-brand-soft` (blue wash): a quiet emphasis band — `<Card variant="tinted">`,
  used for the patient record header.
- Small brand marks: logo tile, record avatar, progress fills.
- Never on page backgrounds, tables, form controls or more than one card in a row.
  No purple/neon gradients, no glass.

Rules:
- Status/accent **text** always uses the `-strong` shade (AA ≥ 4.5:1). The base
  status colors are for fills, dots and bars only.
- Status is never conveyed by color alone — pair with a label or icon.

### Status mapping

| State | Tone |
| --- | --- |
| Draft, Not started, No-show, Inactive | `neutral` |
| Scheduled, Ready for review, Pending, Warning | `warning` |
| Confirmed, Completed, Submitted, Active | `success` |
| In session, Amended, Info | `primary` |
| Checked in | `teal` |
| Cancelled, Error | `danger` |

### Typography

System font (SF on Apple devices). Size-specific tracking is built into the scale:

| Class | Size | Use |
| --- | --- | --- |
| `text-title-1` | 24px, -0.022em | Page / record title, question title |
| `text-title-2` | 20px | Section title in a workspace header |
| `text-title-3` | 17px | Card / dialog / topbar title |
| `text-body` | 14px | Default UI text, values, inputs |
| `text-footnote` | 13px | Descriptions, secondary lines, small buttons |
| `text-caption` | 12px | Meta, hints, badges, errors |
| `text-eyebrow` + `uppercase font-semibold` | 11px, +0.06em | Group labels (sidebar groups, field groups) |

- Weights: `font-semibold` titles, `font-medium` labels/emphasis, normal body.
- Numbers that compare (scores, times, counts) use `tabular-nums`.
- **Times are 12-hour** everywhere: `{ hour: "numeric", minute: "2-digit", hour12: true }`
  → "1:00 PM". Never `hour: "2-digit"` (gives 24h or "01:00").
- Field labels are **sentence case, medium weight** — not uppercase.

### Radius, elevation, spacing

| Token | Value | Classes |
| --- | --- | --- |
| Control radius | 8px | `rounded-md` / `rounded-lg` / `rounded-xl` (buttons, inputs, menu items) |
| Surface radius | 12px | `rounded-2xl` / `rounded-3xl` (cards, dialogs, popovers) |
| Small radius | 6px | `rounded-sm` (kbd, tiny chips) |
| Pills / avatars | — | `rounded-full` |
| Resting card | — | `shadow-xs` + `border-border/70` |
| Raised (hover/sticky) | — | `shadow-md` |
| Floating (menus, dialogs) | — | `shadow-lg` |

Spacing uses the 4px Tailwind scale. Defaults: page sections `gap-5/6`,
card padding `px-5 py-4`, field gap `gap-3`, field group gap `space-y-6`.
Control heights: **32px** (`sm`), **40px** (default), **44px** (`lg`, touch-first).

---

## 3. Components (use these — don't re-implement)

| Need | Use | File |
| --- | --- | --- |
| Logo | `<BrandLogo size stacked inverse asHeading>` — the only way to show the brand (stethoscope tile + **Better**You, same as the app icon). Never hand-build it | `components/common/BrandLogo.tsx` |
| Page frame | `<Page>`, `<PageHeader>` | `components/common/PageLayout.tsx` |
| Button | `<Button variant size loading>` | `components/ui/button.tsx` |
| Card / surface | `<Card>`, `<CardHeader>`, `<CardBody>`, `<CardSection>` | `components/common/Card.tsx` |
| Read-only label/value | `<InfoList>`, `<InfoRow emphasis>`, `<NotRecorded>` | `components/common/Card.tsx` |
| Form field | `<Field label hint error required>`, `<FieldGroup legend>`, `inputClass`, `textareaClass`, `labelClass` | `components/common/Field.tsx` |
| Searchable select | `<SearchableSelect>` | `components/ui/SearchableSelect.tsx` |
| In-page tabs | `<TabBar>` + `tabPanelProps()` | `components/common/Tabs.tsx` |
| 2–4 way switch | `<Segmented>` | `components/common/Tabs.tsx` |
| Status pill | `<Badge tone dot icon>` | `components/common/Badge.tsx` |
| Dialog | `<Modal>` (custom) or `ui/dialog` (Radix) | `components/common/Modal.tsx` |
| Confirm destructive | `<ConfirmationDialog danger>` | `components/common/ConfirmationDialog.tsx` |
| Table | `<DataTable>` — add `sortValue` to a column to make it sortable; `defaultSort` sets the initial order; pages 25 rows by default (`pageSize`, 0 = off) | `components/common/DataTable.tsx` |
| Full-page message | `<StatusScreen icon title message actions>` (404, errors, outside any portal) | `components/common/StatusScreen.tsx` |
| Loading / empty | `<LoadingState>`, `<Skeleton>`, `<EmptyState>` | `components/ui/` |

**Lists of records are DataTables**, full height (`<Page fill>` + `<DataTable fill>`), not hand-built card lists. Toolbar: search on the left, then filters, the primary action on the right. Sortable
columns (dates sort newest-first on first click, statuses in workflow order,
not A–Z), a footer with the count, and one `<Segmented>` above the table whose
options carry their counts ("To do 5 · Drafts 2 · All 10"). One filter
control, not a switch plus separate pills.

**Back navigation**: pass `back` to `PageHeader`. Beside a visible title it
renders an icon button; a chat-style detail (support ticket) puts the back
arrow in the card's pinned header instead.

### Buttons

| Variant | When |
| --- | --- |
| `primary` | The one most important action in the view/dialog (Save changes, Submit, Add patient). Solid blue with a soft brand shadow |
| `featured` | Gradient primary — only for a hero CTA on/near a featured surface |
| `on-brand` | White button for use on a `bg-brand` surface |
| `secondary` | Neutral actions beside a primary (Cancel, Edit patient, Mark completed) |
| `tertiary` | Prominent but not primary; accent-tinted (Session assessment, Open session) |
| `ghost` | Toolbars, card-header actions, icon buttons |
| `danger-ghost` | Entry point to a destructive action (Cancel appointment, Delete) |
| `destructive` | Only the confirm step of a destructive action |
| `link` | Inline text actions |

Pass `loading` instead of hand-rolling spinners. Icon-only buttons need
`aria-label`. Use `asChild` to style a `<Link>` as a button.

### Cards

```tsx
<Card>
  <CardHeader title="General information" description="Optional" actions={<Button variant="ghost" size="sm">Edit</Button>} />
  <CardBody>
    <InfoList>
      <InfoRow label="Gender">Male</InfoRow>
      <InfoRow label="Allergies" emphasis="warning">Codeine</InfoRow>
    </InfoList>
  </CardBody>
</Card>
```

### Forms

```tsx
<FieldGroup legend="Contact">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <Field label="Email" htmlFor="email" required error={errors.email?.message}>
      <input id="email" className={inputClass} aria-invalid={!!errors.email} {...register("email")} />
    </Field>
  </div>
</FieldGroup>
```
- Group related fields under a `FieldGroup` legend (e.g. Session / When / Notes).
- Validate inline; show errors under the field with `role="alert"`.
- Never define a local `fieldCls`/`inputCls` — import `inputClass`.

### Dialogs

- Footer: destructive `danger-ghost` actions on the **left**, the single
  `primary` on the **right**. Secondary "Cancel" only when there's no ✕ or
  when it reads clearer.
- Overlays must portal to `<body>` (`Modal` does). A `fixed inset-0` element
  rendered inside a `space-y-*` parent gets shifted by the margin.
- Keep dialogs ≤ `sm:max-w-lg` unless the content is genuinely wide.

### Empty states

Icon (28px, `text-text-light`) → one-line title (`text-body font-medium`) →
one sentence of what to do next (`text-footnote text-text-secondary`) →
optional **tertiary** action (the header keeps the primary "Add"). Use
`<EmptyState>`. Never leave a section blank.

---

## 4. Layout patterns

### Practitioner shell
- **Topbar** (solid, 56px): page title for top-level pages; breadcrumb
  `Section › Record` for detail pages. Set the trailing crumb with
  `useDetailCrumb(label)`.
- **Content**: `<Page>` uses full width (flex column, `gap-6`). In the shell,
  `<PageHeader>` renders **one toolbar row**: `toolbar` (search, filters) on the
  **left**, `actions` (Add …) on the **right** — no visible
  title, no subtitle (its `<h1>` stays for screen readers). Don't put
  descriptive copy in a subtitle; if a page truly needs explanation, put it
  where it's used (field hint, empty state). A detail-page title that differs
  from the crumb (e.g. a ticket subject) stays visible with its subtitle.
- **Controls that shape a component live in it**: e.g. "Manage availability"
  is in the calendar's own toolbar beside Month / Week / Day, not the page header.
- **Sidebar**: grouped (Clinic / Practice), tinted selection
  (`bg-primary/10 text-primary-strong`) — never a solid accent block.

- **Installed app (PWA) safe areas**: the app draws edge to edge
  (`viewport-fit=cover`). Fixed chrome uses the safe-area spacing tokens:
  `h-topbar pt-safe-t` for a top bar, `h-bottomnav pb-safe-b` for a bottom nav,
  and `pt-topbar` / `pb-bottomnav` to offset scrolling content under them. Any
  new bottom-pinned surface (sheet footer, composer) adds `pb-safe-b`. Use
  `100dvh`, not `h-screen`, for full-height shells.

### Record / detail page (see `patientProfile/PatientProfile.tsx`)
1. **Identity card**: avatar, name (`title-1`) + status badge, inline facts
   (`label` caption + `value` body-medium), actions on the right.
2. **Flags row**: `Badge`s for clinically important facts (allergies first).
3. **`TabBar`** attached to the bottom of the identity card (text-only labels).
4. **Tab panel** on the canvas: cards in a 2-column grid
   (`lg:grid-cols-2` or `minmax(0,1fr)_24rem` for main + side).
5. **One tab per question, no overlap.** Patient record tabs:
   Dashboard (what's going on — summary + a date-grouped **Timeline**:
   one node per day, upcoming highlighted, "Show full timeline" expands) · Patient (who they are) · EMR Notes (what was recorded)
   · Care Plan (what they're on now) · Appointments (when they're seen).
   Don't add a tab that re-lists another tab's data (e.g. a separate
   "Timeline") — fold it into the Dashboard or an "All" view.
6. Related record types share one tab with a `<Segmented>` switcher, led by
   an **All** view where it helps: **EMR Notes** = All (one DataTable, newest
   first: Date · Type · Author/status · Summary; a row opens the record in its
   own view) | Session notes | Assessments | Documents. **Care Plan** =
   Treatment plans | Medications. The switcher names the view, so views have
   no heading — just a one-line description and their "Add" action.

### Workspace page (see `assessments/`)
Fill-height `<Page fill>` with one card containing: tab strip → header with
status + actions → progress → 3 columns (nav rail `bg-bg-subtle` | content |
context rail `bg-bg-subtle`).

---

## 5. Motion (from the apple-design skill)

- Press feedback: uniform `scale(0.97)`, instant on press (global rule in
  `globals.css`). No squash, no overshoot on taps.
- Springs for anything that moves: `{ type: "spring", bounce: 0, duration: 0.35 }`.
  Bounce only after a flick/drag with momentum.
- Enter and exit along the same path; popovers scale from their trigger
  (`origin-top-right` etc.).
- CSS transitions use `ease-apple` (`cubic-bezier(0.32,0.72,0,1)`), 150–250ms.
- Never block input during a transition (`Modal` lets clicks through while exiting).
- **Reduced motion**: replace movement with a ≤200ms fade
  (`motion-reduce:` variants, `useReducedMotion()` in framer-motion).

---

## 6. Accessibility checklist

- [ ] Text contrast ≥ 4.5:1 (use `-strong` shades for colored text).
- [ ] Visible focus: `focus-visible:ring-2 focus-visible:ring-primary/40`.
- [ ] Every input has a `<label htmlFor>`; errors use `role="alert"` and `aria-invalid`.
- [ ] Tabs use `TabBar` (roles + arrow-key navigation built in).
- [ ] Status never by color alone; icon-only buttons have `aria-label`.
- [ ] Works at 390px wide with no horizontal page scroll; tab bars scroll, not squash.
- [ ] Respects `prefers-reduced-motion` and `prefers-contrast: more`.

## 7. Before you ship a UI change

1. Built only from the components and tokens above?
2. One primary action? Destructive actions separated and confirmed?
3. No repeated page title, no nested bordered cards, no hard-coded colors?
4. Checked light + dark, desktop + 390px, keyboard only?
5. If you added a new pattern, did you add it to this file?
