# AGENTS.md

## Scope

These instructions apply to the entire ATMS frontend repository.

Treat this repository as a real production application. Follow the existing architecture, design system, naming, and coding conventions before introducing new patterns.

## Core working rules

1. Inspect the relevant code before editing.
2. Find the closest existing implementation and follow its structure, naming, UI patterns, and test style.
3. Prefer small, focused, maintainable changes over broad rewrites.
4. Do not modify unrelated files.
5. Do not add production dependencies without explicit approval.
6. Do not weaken typing, validation, state cleanup, accessibility, tests, or error handling merely to make a task pass.
7. Never claim that a build, test, manual check, or UI flow passed unless it was actually executed.
8. Before a complex change, summarize:
   - current behavior;
   - intended implementation;
   - assumptions;
   - risks;
   - likely files to change.
9. After implementation, report:
   - changed files;
   - commands executed;
   - build and test results;
   - manual verification performed;
   - anything that could not be verified;
   - remaining risks.
10. Suggest up to three concrete improvements when they would materially improve usability, performance, accessibility, or maintainability. Do not implement unrelated improvements without approval.

---

# Angular architecture

- Write new frontend code using modern Angular 22 patterns.
- Keep the application zoneless. Do not add `zone.js` or configure zone-based change detection.
- Use standalone Angular APIs and the existing standalone architecture.
- Prefer signals for local and derived UI state:
  - `signal()`;
  - `computed()`;
  - `effect()` only for actual side effects;
  - `input()` and `input.required()` instead of `@Input`;
  - `output()` instead of `@Output`.
- Use RxJS for HTTP, asynchronous streams, and event composition where it is the clearer tool.
- Do not replace every Observable with a signal mechanically.
- Use Angular built-in control flow:
  - `@if`;
  - `@for`;
  - `@switch`.
- Preserve OnPush behavior.
- Add explicit `ChangeDetectionStrategy.OnPush` where the repository convention requires it or where it improves clarity.
- Do not switch components to eager change detection without a documented reason.
- Prefer immutable state updates.
- Use `inject()` where it matches the existing project style.
- Use `DestroyRef` and `takeUntilDestroyed()` for subscriptions that require cleanup.
- Keep business logic out of templates and presentational components.
- Avoid unnecessary `effect()` usage. Prefer `computed()` for derived state.

---

# Existing pages and reusable components

- Before creating a page, locate the closest existing page with similar behavior.
- A list page with filters, create actions, table, sorting, and pagination should normally follow an existing page such as Users or Organizations.
- Reuse the existing:
  - layout;
  - spacing;
  - forms;
  - tables;
  - pagination;
  - loading states;
  - empty states;
  - error states;
  - actions;
  - dialogs.
- Do not blindly copy existing defects, obsolete code, or unrelated business logic.
- When a component, form wrapper, table action, dialog, layout block, or code pattern is already repeated or highly likely to be reused, extract it into the existing common/shared components area.
- Do not create a shared abstraction for code that is genuinely page-specific.
- Prefer composition over large configurable components with many unrelated flags.

---

# Redux and state cleanup

- Treat feature-scoped Redux/NgRx cleanup as mandatory.
- Clear temporary state when the user leaves the feature and the state is no longer valid.
- Do not rely only on `ngOnDestroy`.
- Inspect all realistic exit paths, including:
  - router navigation;
  - cancel and close actions;
  - successful create/update completion;
  - switching entities;
  - logout;
  - role or tenant changes;
  - redirects caused by guards;
  - leaving a multi-step flow.
- Add an explicit reset action or equivalent cleanup where required.
- Do not clear state that is intentionally shared with another active route or feature.
- Clean up subscriptions, timers, effects, event listeners, and temporary UI state.
- When changing store behavior, add or update reducer, effect, selector, and component tests as appropriate.

---

# TypeScript rules

- Keep TypeScript strict.
- Do not use `any`.
- Use `unknown` only at genuine untrusted boundaries, such as raw external data or caught errors, and narrow it immediately with a type guard or parser.
- Define accurate request, response, state, event, and component types.
- Do not use unsafe type assertions merely to silence the compiler.
- Prefer discriminated unions, generics, mapped types, and type guards when they make states explicit.
- Keep separate public contracts in separate files.
- Do not place commands, models, responses, filters, and unrelated interfaces together in one generic file such as `product.model.ts`.
- Use focused files and names, for example:
  - `create-product.command.ts`;
  - `update-product.command.ts`;
  - `product.model.ts`;
  - `product-filter.ts`;
  - `product-response.ts`.
- Follow the repository's established naming and folder conventions when they are more specific.

---

# Responsive and mobile UX

- Every new or modified page must be responsive and usable on desktop, tablet, and phone.
- Do not treat mobile as a scaled-down desktop.
- Verify layout at representative widths, including approximately:
  - 1440 px;
  - 1024 px;
  - 768 px;
  - 390 px;
  - 360 px.
- Prevent horizontal page overflow unless a specific component, such as a data table, intentionally uses a controlled horizontal scroll area.
- Forms, dialogs, cards, tables, filters, labels, validation messages, and action areas must remain readable and usable on narrow screens.
- Use responsive grids and flexible layouts instead of fixed pixel widths where possible.
- On phones:
  - a single primary action should normally use the full available width;
  - two related actions such as Create and Filter should normally share one row with equal flexible widths when space allows;
  - when the row becomes too narrow, stack the actions vertically and make both full width;
  - touch targets must remain comfortably clickable;
  - action labels must not be clipped.
- Do not leave desktop-sized empty spacing on mobile.
- Preserve keyboard navigation and visible focus states.
- Add accessible labels and ARIA attributes where native semantics are insufficient.

---

# Theme and visual consistency

- ATMS uses the existing orange theme.
- Reuse existing theme tokens, CSS variables, component variants, typography, spacing, border radii, shadows, and interaction states.
- Do not introduce arbitrary colors when a theme token exists.
- When adapting UI from another project, including ACS, copy behavior and structure but convert all colors, buttons, states, typography, spacing, and component styling to the ATMS design system.
- Never copy another project's theme directly into ATMS.
- Keep destructive actions visually distinct from primary orange actions according to the existing design system.

---

# Confirmations and unsaved changes

- Add a confirmation dialog before destructive or irreversible actions such as delete, revoke, deny, permanent removal, or destructive cancellation.
- Confirmation text must clearly state:
  - what will happen;
  - which item is affected when known;
  - whether the action can be undone.
- Use clear Yes/No or Confirm/Cancel actions consistent with the application.
- Do not show unnecessary confirmation dialogs for harmless navigation.
- Warn about leaving a form only when unsaved user changes would be lost.

---

# Frontend testing and verification

- Every new behavior and bug fix must have automated test coverage when technically practical.
- Update existing tests when behavior changes.
- Add a regression test for a bug fix.
- Run the smallest relevant test set during implementation.
- Before completion, run the affected frontend tests and broader frontend test suite when feasible.
- Use focused test files for components, services, stores, guards, validators, pipes, and utilities.
- Test store reset and cleanup behavior when relevant.

After implementing or fixing UI functionality:

1. Run the relevant frontend build, type checking, linting, and automated tests available in the repository.
2. Start the application when the environment permits it.
3. Manually inspect the affected flow on desktop and mobile-sized viewports.
4. Check:
   - visual appearance;
   - responsive behavior;
   - loading state;
   - empty state;
   - error state;
   - validation;
   - disabled state;
   - confirmation dialogs;
   - navigation and exit paths;
   - Redux/NgRx cleanup;
   - browser console errors and warnings;
   - accidental CSS regressions.
5. If browser-based manual verification is unavailable, explicitly state that it was not performed and list the remaining manual checks. Do not claim visual correctness based only on a successful build.


---

# Explicit ATMS frontend rules — mandatory

## Reuse and common/shared components

- If a UI component, code block, form control group, table action block, dialog, layout fragment, or interaction pattern is already repeated, extract it into the existing `common` or `shared` components area.
- Also extract it when there is a high probability that the same component or code block will be reused by future pages.
- Before creating a new shared component, search the repository for an existing equivalent.
- Do not leave repeated UI code in several feature folders when it can reasonably be implemented once in `common/shared`.
- Do not create a generic shared component when the code is genuinely specific to one page.

## Separate TypeScript contracts into separate files

- Do not put commands, models, responses, filters, events, and unrelated interfaces into one file such as `product.model.ts`.
- Create focused files for separate contracts, for example:
  - `create-product.command.ts`;
  - `update-product.command.ts`;
  - `product.model.ts`;
  - `product-response.ts`;
  - `product-filter.ts`;
  - `product-event.ts`.
- One file may contain tightly coupled helper types only when splitting them would make the code less clear.
- Follow existing repository folders and naming conventions, but never use one generic model file as a container for all Product-related types.

## Existing page is the default template

- For standard ATMS pages, use an existing similar page as the implementation template in almost all cases.
- Treat this as the default approach for approximately 99% of ordinary CRUD/list pages.
- Example: when creating a Products page with filters, a Create button, table, sorting, and pagination:
  1. find the closest existing page, such as Users or Organizations;
  2. copy its established page structure and interaction pattern;
  3. replace only the domain-specific models, labels, columns, actions, permissions, and API calls;
  4. preserve the established loading, empty, error, filter, sorting, pagination, responsive, and state-management behavior.
- Do not design a completely different page from scratch when the application already has a matching pattern.
- Do not blindly copy bugs, obsolete code, incorrect permissions, or unrelated business logic.

## Mobile action buttons

- Desktop buttons must not merely become smaller desktop buttons on a phone.
- On narrow mobile screens, action buttons must use the available width and look like mobile controls.
- When there is one primary action, such as Create:
  - make it full width on phone-sized screens.
- When there are two related actions, such as Create and Filter:
  - place them consecutively in one row;
  - give both equal flexible widths;
  - make the pair fill the full available row width;
  - keep an appropriate gap between them.
- If the screen is too narrow for readable labels:
  - stack the buttons vertically;
  - make each button full width.
- Never leave tiny desktop-sized buttons floating in unused mobile space.
- Verify that labels are not clipped and touch targets remain comfortably clickable.

## ATMS orange theme and importing UI from ACS

- The existing ATMS orange theme is mandatory.
- When the user asks to copy or adapt UI from another project, including ACS:
  - copy only the required behavior, layout idea, and reusable structure;
  - replace the source project's colors, button variants, typography, spacing, states, shadows, and other theme-specific styles with ATMS equivalents;
  - ensure primary buttons and active states follow the existing ATMS orange theme;
  - do not import another project's theme files or arbitrary color values.
- The final UI must look like a native ATMS page, not like a foreign page embedded into ATMS.

## Mandatory manual UI verification

- A successful build is not sufficient verification for a UI feature or bug fix.
- After every UI implementation or UI bug fix, start the application and manually inspect the affected flow when the environment provides a runnable browser.
- Check the actual rendered UI at desktop and phone widths.
- Verify:
  - the page still looks visually consistent with ATMS;
  - responsive behavior is correct;
  - buttons adapt correctly on mobile;
  - no CSS rule breaks nearby pages or components;
  - there is no accidental horizontal page overflow;
  - dialogs, tables, forms, filters, validation messages, and action areas remain usable;
  - the browser console has no new errors or warnings;
  - the result does not merely function but also looks professionally acceptable.
- If the UI looks broken, inconsistent, cramped, visually poor, or non-responsive, fix it before declaring the task complete.
- If browser-based verification cannot be performed, explicitly state that manual visual verification and console inspection were not completed. Never replace this statement with a claim based only on build success.

---

# Definition of done

A frontend task is complete only when all applicable items are satisfied:

- Existing patterns were inspected and followed.
- The implementation is focused and maintainable.
- Angular 22 and zoneless patterns were preserved.
- Reusable code was extracted only where justified.
- Redux/NgRx state cleanup was considered for every exit path.
- TypeScript types are accurate and no `any` was introduced.
- Responsive behavior was verified for desktop and mobile.
- The ATMS orange theme and design system were preserved.
- Confirmation dialogs were added for destructive actions when applicable.
- Relevant automated tests were added or updated.
- Build, type checking, linting, and tests were actually run where possible.
- UI was manually inspected and browser console checked when browser access was available.
- The final diff contains no unrelated changes.
- Any unverified item is explicitly reported.
