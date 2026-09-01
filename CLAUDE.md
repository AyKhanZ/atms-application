# BAIM — frontend

Angular 20 (standalone components, signals) + PrimeNG + NgRx. This is the client of BAIM, a
commercial B2B project and task management product.

## Where things are written down

Read the relevant file **before** starting, not after.

| You are about to | Read |
|---|---|
| Design or change any screen | `docs/ai/UX_UI_PRINCIPLES.md` |
| Touch anything role-, permission- or domain-related | `docs/ai/PRODUCT_CONTEXT.md` |
| Write code | `AGENTS.md` |
| Build a screen that already has agreed behaviour | `../Specs/1_BAIM_Project specification.docx` |

`Specs/` holds decisions that are already made and were often argued over. Check it before
proposing an alternative that was rejected months ago.

## Commands

```bash
npm start                              # dev server on :4200
npx ng build --configuration development   # fast build, use to check compilation
npx ng test --watch=false              # full unit suite
```

Both a build and the test suite must pass before work is reported as done. Never claim a build,
test or manual check passed unless it was actually run.

## Traps in this project

Things that cost real time when you do not know them.

**`angular.json` is read only at startup.** Change it and the running `ng serve` keeps the old
config, so builds start failing with confusing 404s on lazy chunks. Restart the dev server and
tell the user to do the same — say it loudly, not as a footnote.

**API page size is capped at 50.** Keyset-paginated endpoints reject anything larger with a 400.
To load everything, follow the cursor.

**One session per account.** The refresh token is a single column on the user row, so logging in
again anywhere invalidates every other session. Do not log in as the user's account to test —
you will end their session. See `../Specs/auth-sessions.html`.

**Grid and flex children need `min-width: 0`.** Otherwise their intrinsic minimum is the
untruncated text and a long title blows the layout out of the viewport, silently carrying
neighbouring content off-screen.

## Working rules

1. Inspect the relevant code before editing. Find the closest existing implementation and follow
   its structure, naming, patterns and test style.
2. Prefer small, focused changes. Do not modify unrelated files.
3. Do not add production dependencies without approval.
4. Do not weaken typing, validation, accessibility, tests or error handling to make something
   pass.
5. Report honestly: what changed, what was run, what passed, what could not be verified, what
   risk remains.
6. When a requirement looks wrong, say so in a sentence and continue — do not silently
   substitute your own idea.

## What "done" means

A technically correct implementation with poor UX is not done. For UI work, act as a product
designer first and an engineer second: decide what the screen is for, what matters on it, and
which existing pattern it should follow — then write the code.
