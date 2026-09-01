# BAIM — UX/UI Principles

Design rules for BAIM. Product domain lives in `PRODUCT_CONTEXT.md`; engineering rules live in
`AGENTS.md`; decisions already taken on specific screens live in `Specs/`.

---

## 1. The design system, as it actually is

Consistency rules are worthless without the values to be consistent with. These are the real
values in the codebase — use them instead of inventing new ones.

### Colour tokens

Defined in `src/styles.scss` under `:root`. Always reference the token, never the raw hex.

| Token | Use for |
|---|---|
| `--app-surface` | Panel and card background |
| `--app-surface-muted` | Recessed areas: table headers, section headers inside a panel |
| `--app-border` | Every ordinary border and divider |
| `--app-text` | Body text |
| `--app-muted` | Secondary text, labels, captions |
| `--gray-icon` | Icons with no state of their own |
| `--orange` | The accent itself: active tab underline, focus, selected state |
| `--orange-text-hover` | Accent-coloured text and icons (darker, passes contrast on white) |
| `--orange-light` | Selected-row and current-item background |
| `--orange-light-hover` | Hover background on interactive rows |
| `--orange-border` | Border of an accented element |
| `--orange-focus-outline` | `outline` colour for `:focus-visible` |
| `--app-success` / `--green-text` | Success, Closed |
| `--app-danger` / `--red-hover` | Destructive actions, errors |
| `--red-hover-bg` | Background of a danger chip or row |

There are also legacy aliases (`--primary-color`, `--gray-color`, `--text`, `--border`). Prefer
the `--app-*` and `--orange-*` names in new code.

### Radius

`--radius-btn` and `--radius-card` are both `8px`. Chips use `0.45rem`. Do not introduce a third
radius without a reason.

### Spacing

Use multiples of `0.25rem`. Common steps: `0.25 / 0.5 / 0.75 / 1 / 1.5 / 2rem`. Panel padding is
`1.5rem` on desktop, `1rem` on narrow screens.

Avoid arbitrary values such as `13px` or `19px` unless something concrete requires them.

### Breakpoints

**Current state:** the codebase contains roughly fifteen different container-query widths and
another ten media-query widths, mixing `rem` and `px`. There is no scale yet.

**Target scale**, to converge on. Prefer `@container` over `@media` — panels should react to
their own width, not the viewport:

| Width | Meaning |
|---|---|
| `30rem` | Narrow: single column, actions stack full-width |
| `42rem` | Two-column layouts collapse to one |
| `50rem` | Side column moves below the main content |
| `64rem` | Wide desktop refinements |

New code uses these. Existing code migrates when it is touched anyway — do not open a separate
crusade.

### Chips (status, type, priority, metadata)

All chips share one geometry — height, padding, radius, border, font size — enforced by the
`chip` Sass mixin in `src/styles/_chip.scss`:

```scss
@use 'chip';

.my-status { @include chip.base; }
.my-status--prominent { @include chip.prominent; }
```

**Never copy the declarations.** Six separate copies are exactly how the chips silently drifted
apart before the mixin existed.

Two rules that are easy to get wrong:

- **Priority carries no icon.** The icon slot belongs to Type. Directional arrows were tried and
  read as noise rather than as severity.
- **The priority scale contains no green.** Green already means success and Closed in the status
  scale.

Detail page headers use `chip.prominent` so the entity's own status reads at heading weight.

---

## 2. Priority order

When two goals conflict, resolve in this order:

**UX clarity → Information architecture → Consistency → Usability → Visual quality.**

Consistency beats local prettiness. A component that looks slightly better on one page but
breaks the pattern used everywhere else is a net loss.

---

## 3. Reuse before invention

Before building anything new:

1. Look for an existing component.
2. Look for a page that already solves a similar problem.
3. Reuse the pattern if it fits.

A new pattern is justified only when the existing one genuinely does not solve the UX problem.
When that happens, say so explicitly rather than quietly diverging.

The default template for a new page is the closest existing page. Ticket Details was built from
Project Details for exactly this reason: the same entity should read the same way everywhere.

---

## 4. Every element needs a reason

Before adding anything, answer:

1. What user problem does it solve?
2. Why here?
3. How important is it?
4. Does an existing component already do this?
5. Is this information already on the screen somewhere else?

If the answers are weak, the element is not needed. Empty space is not a problem to be solved by
adding widgets.

---

## 5. Information hierarchy

Not everything can have the same visual weight. Decide consciously, per screen:

| Level | Meaning |
|---|---|
| Critical | Why the user opened the page |
| Primary | The main working information and actions |
| Secondary | Useful context |
| Supporting | Metadata and detail |
| On demand | Can stay hidden until needed |

A page should answer, roughly in this order: Where am I? What is this? What state is it in?
What matters most? What can I do? What else is available?

---

## 6. Do not duplicate information

The same fact should not appear twice on one screen without a workflow reason.

Real example from this project: the ticket page once carried both a top-bar breadcrumb and an
in-page breadcrumb, so the ticket title appeared **three times** on one screen. The in-page one
was deleted.

---

## 7. Density

BAIM is a working B2B tool, not a marketing page. It should be neither airy nor cramped.

A dense page is fine when hierarchy is clear, data is grouped, typography supports scanning,
secondary information does not compete with primary, and spacing is consistent.

---

## 8. Containers

Not every group of data becomes a card. Reach first for typography, spacing, dividers and
section hierarchy.

A card is justified by semantic grouping, interaction grouping, or a real need for visual
separation. A page should not turn into a collection of white islands.

---

## 9. Orange identity

BAIM is orange, white and grey. Orange is an **accent**: primary actions, selected state, focus,
active navigation, meaningful highlights.

Not everything should be orange. Large areas must let the eye rest. Never migrate the product
towards a blue SaaS, purple AI or dark enterprise palette.

---

## 10. Colour semantics

Semantic colours mean one thing consistently: success, warning, error, information, neutral.
Never pick a bright colour just to make a screen more interesting.

Colour is never the only carrier of meaning — pair it with text or shape, both for accessibility
and because a chip that differs only by hue is unreadable at a glance.

---

## 11. Typography

Define and reuse roles: page title, section title, entity title, body, secondary, metadata,
label, helper, caption.

Do not invent a new font size per element.

---

## 12. Entity identity

Project, Ticket, Task and Subtask must be recognisable in the same way everywhere.

- Entity codes are written with a leading hash: `#7`, `#29`.
- Identity sits on the left of a page header: code, then title.
- State sits on the right: who updated it and when, with the status chip.
- Type, status and assignee are rendered the same way in a list row and on the entity's page.

Do not move identity information around between pages.

---

## 13. Breadcrumbs

Only in the top bar. A page must never render a second in-page trail.

The trail contains **only real routes**. Group and Milestone never appear in it, because they
have no pages — they are layers inside the Plan tab. Reaching them is what the "View in Plan"
button is for.

Create and Edit pages add no final crumb. The trail ends at the entity being edited; the page
heading already states the mode, and the last crumb then doubles as a way back to the entity.

---

## 14. Forms

Predictable, logically grouped, visually balanced. Related fields sit together — Start Date next
to Target Date.

Do not stretch a small select across the full page width without reason.

Required fields must be obvious. Validation appears next to the field that has the problem.

Opening Create or Edit records where the user came from: Back, Cancel and a successful Save all
return there.

---

## 15. Permissions

If the user cannot perform an action, prefer not to show it. Show it disabled only when its
existence is information the user benefits from.

The UI should not routinely walk users into "Access denied". This matters most for Clients.

---

## 16. Client experience

Client UX is first-class, not a stripped-down Employee UI.

For anything a Client can see, decide deliberately: what matters to them, what they should see,
what they should not, which terminology they will not know, which actions are unavailable.

A Client should be able to understand the state of their project without training.

---

## 17. Progressive disclosure

Secondary information can live behind tabs, expandable blocks, drawers, tooltips or contextual
menus. Primary data must never be hidden.

---

## 18. States

For every serious component or page, think through: loading, loaded, empty, error, disabled,
permission-restricted, long text, many items, one item, narrow screen, slow network.

**Long text is the one most often forgotten** and it breaks layouts hard. A ticket title can run
to a hundred characters; a description to two thousand. Grid and flex children need explicit
`min-width: 0` or their intrinsic minimum is the untruncated text — this exact bug blanked an
entire metadata column on Ticket Details.

---

## 19. Empty states

An empty state must not look like an error. It says what will be here, why it is empty, and what
the user can do. No marketing paragraphs.

Use the shared `app-empty-state` component rather than rebuilding the markup.

---

## 20. Responsive

Every screen is designed with its responsive behaviour, not with responsiveness deferred.

Decide explicitly what wraps, what stacks, what collapses, what scrolls, what becomes a drawer,
what moves into an overflow menu, and what must stay visible.

Shrinking a desktop layout is not responsive design.

---

## 21. Accessibility

Text contrast, keyboard navigation, visible focus states, adequate target sizes, labels,
disabled states, semantic HTML.

Never rely on colour alone.

---

## 22. History UX

History is an audit trail. Chronology, actor, timestamp, changed object, changed fields, before
and after values.

Do not reduce it to a decorative activity feed. The user must be able to see what specifically
changed.

---

## 23. Attachments UX

Aggregated attachment views answer one question: **"where did this file come from?"** A filename
alone does not. Design a compact hierarchy representation and make the source Task or Subtask
reachable.

---

## 24. AI-generated UI: what it actually looks like here

Generic warnings do not help, so these are real examples from this codebase.

**Panels that state nothing.** The ticket page carried a "Tasks — 0" panel that existed only to
fill the layout. Deleted; Tasks became a tab with a proper empty state.

**Controls that promise more than exists.** The ticket switcher had a "Show all in Plan" footer,
copied from search dropdowns where the list is truncated. Here the list already contained every
ticket, so the control offered to show the user what they were already looking at. Deleted.

**Decoration mistaken for information.** Priority chips originally carried ↑ / ⇊ arrows. They
looked meaningful and communicated nothing — nobody could say whether ⇊ was lower than ↓.
Removed; priority is colour and text.

**Repeating the obvious.** Adding an "Edit" breadcrumb under a heading that already says "Edit
ticket".

**Steps where there is no sequence.** Prev/Next buttons on tickets were rejected: ticket order
is never communicated to the user, so a step control implies an order that does not exist.

The pattern behind all five: an element was added because the position in the layout expected
one, not because the user needed it. Before adding anything, be able to name the user problem
it solves.

---

## 25. Review checklist

Before considering a screen done:

- **Hierarchy** — is it obvious what matters most?
- **Consistency** — does a similar pattern exist, and was it used?
- **Duplication** — does any fact appear twice?
- **Density** — neither empty nor overloaded?
- **Actions** — is the primary action obvious?
- **Client** — would a non-technical user understand this?
- **Responsive** — is narrow-screen behaviour defined?
- **Edge cases** — long titles, empty data, many items, one item, permissions, loading, errors.
- **Tokens** — are all colours, radii and spacings from the system?
- **Focus** — is there a visible keyboard focus state?
