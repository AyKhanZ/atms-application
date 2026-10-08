# BAIM — client (atms-application)

The web client of BAIM: projects, tasks and teamwork for the company's staff and its clients.
The backend is in `../atms-services`; this app talks to it only through the Gateway
(`http://localhost:5000` locally).

## Stack

Angular 21 (standalone components, signals), PrimeNG + PrimeIcons, NgRx Store, SignalR for live
updates, Chart.js for the dashboard, Vitest for unit tests.

## Run it

```bash
npm install
npm start
```

Open http://localhost:4200. The backend (Gateway + Admin API + Project API) must be running, see
`../atms-services/README.md`.

| Command | What it does |
|---|---|
| `npm start` | dev server on :4200 with live reload |
| `npx ng build --configuration development` | quick build, to check that everything compiles |
| `npm run build` | production build into `dist/` |
| `npx ng test --watch=false` | all unit tests once |

The API address is in `src/environments/environment*.ts`.

## Screens

- **Login, password reset, onboarding** — on the first sign-in a person sets a real password and fills in the profile.
- **Dashboard** — counts, charts, deadlines and recent activity.
- **Projects** — list, details, plan (groups → milestones → tickets → tasks), comments, files, history.
- **Tasks** — one board (New / In Progress / Done) and a list across all projects, with filters.
- **Notifications** — the bell and the full list.
- **Global search** — by code or title, from anywhere (top bar).
- **Admin** — users and organizations, for the super admin.
- **Settings** — profile, photo, language, password.

## Folders

```
src/app/
  core/      services (HTTP), guards, interceptors, models, enums, constants
  store/     NgRx: one folder per feature (actions, reducer, effects, selectors)
  pages/     screens, grouped by route (projects, tasks, dashboard, admin, …)
  shared/    reusable components, directives, pipes, validators, layouts
```

How data moves: a page dispatches an action → an effect calls a service in `core/services` → the
reducer stores the result → the page reads it with a selector. Creating, changing and deleting
projects, tickets and tasks always goes through the store, never straight from a component.

Access is checked twice: the guards in `core/guards` hide what the user can't open, and the
backend refuses it anyway.
