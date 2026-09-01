# BAIM — Product Context

> **Canonical copy:** `atms-application/docs/ai/PRODUCT_CONTEXT.md`.
> An identical copy lives in `atms-services/docs/ai/` so backend agents have it too.
> Edit the canonical copy and copy it across; do not let the two drift.

This file describes **what BAIM is and who uses it**. It contains no design rules and no
engineering rules.

| Looking for | Read |
|---|---|
| Visual and UX rules | `docs/ai/UX_UI_PRINCIPLES.md` |
| Engineering rules | `AGENTS.md` |
| Product decisions already taken | `Specs/1_BAIM_Project specification.docx` |

---

## 1. What the product is

BAIM — Biznesin Avtomatlaşdırma və İnkişaf Mərkəzi — is a web application for managing
projects, tickets and team work.

It sits in the same category as Jira, Azure DevOps and Bitrix24, and those are fair sources of
UX patterns. It must not become a visual copy of any of them.

## 2. Why it exists

This is the most important section in this file, because it explains decisions that the code
cannot.

BAIM is not only an internal task tracker. **Clients of the company are given accounts too.**

That came from a concrete operational problem. Clients constantly ask:

- What stage is my project at?
- What is done, what is in progress, what is left?
- Are there delays?
- Who is working on it?

Employees answer these by hand, over and over. BAIM exists to remove that correspondence: the
client opens their project and sees the permitted information themselves.

So BAIM is simultaneously an internal project management system, a task tracker, a **client
transparency portal**, and a collaboration space between the company and its clients.

**The consequence for every design decision:** some users are clients who may be seeing a task
management system for the first time. The interface cannot assume Jira literacy. A Client is a
first-class user, not an Employee with features removed.

---

## 3. Global roles

Four roles exist in the system.

**Super Admin** — administers the system: registers users, creates organizations, creates
projects, manages participants, assigns project roles. Sees all projects.

**Employee** — works for the company that runs BAIM. Works with projects, tickets, tasks and
subtasks, changes statuses, records work. Registration needs only First Name, Last Name and
Email — no organization. The rest is filled in during onboarding.

**Client** — belongs to a client Organization and has restricted access. Their job is to see
the state of their project without asking an employee. Must not see internal information that
is not meant for them.

**Client Manager** — a privileged client user, also belonging to an Organization. The one thing
that distinguishes them: they can invite colleagues from their own organization, who then
become Clients. This exists so Super Admin does not have to register every client employee by
hand.

### Registration

| Role | Organization required |
|---|---|
| Employee | No |
| Client | Yes |
| Client Manager | Yes |

### Onboarding

Depends on the global role.

- Employee: Personal Information → Security
- Client: Personal Information → Security
- Client Manager: Personal Information → Security → **Invite**

The Invite step is what lets a Client Manager create client users independently.

---

## 4. Project roles

Project roles are **separate from global roles**. A global role says what kind of user someone
is in the system; a project role says what they do inside one project.

- Project Manager
- Business Consultant
- Developer
- Client Viewer
- Client Manager

**Restrictions**, which the UI must respect and not merely the backend:

- Client Viewer and Client Manager can only be assigned to users with a client global role, and
  only in a project whose Kind is not Internal.
- Project Manager, Business Consultant and Developer are for Employee users.

The interface must not offer combinations that will be rejected.

---

## 5. Projects

A project has both a **Type** and a **Kind**. These are different fields and are easy to
confuse:

| Field | Meaning | Example values |
|---|---|---|
| **Type** | Classification of the work | Optimal, … |
| **Kind** | Whether the project is internal or for a client | One Time, Internal, … |

**Organization is driven by Kind, not Type.** The Organization field is shown only when Kind is
not `Internal`. An internal project belongs to the company itself and has no client
organization, so client users do not take part in it.

Participants are chosen from registered users, each with a project role. Maximum 20 per project.

The Participants panel must remain available regardless of whether an organization has been
selected, because BAIM employees can be added without one.

### Visibility

- Super Admin sees all projects.
- Everyone else sees only projects they participate in.

---

## 6. Work hierarchy

```
Project
└── Group
    └── Milestone
        └── Ticket
            └── Task
                └── Subtask
```

Not every level is an equally full entity, and this matters for features like History and
Attachments:

- **Project, Ticket, Task, Subtask** are full working entities.
- **Group and Milestone** are organizational structure. They have no pages of their own and no
  separate History.

---

## 7. History

History is a real part of the product, not a decorative activity feed. A user must be able to
tell what specifically changed.

Every record carries: actor, timestamp, changed object, changed field, old value, new value.

```
Status         Draft → Active
Target Date    12 September → 20 September
Project Manager  John Doe → Alice Smith
```

**Project History** records changes to the project, made when Edit Project is submitted. Because
Group and Milestone have no History of their own, **their changes appear in Project History**,
so it covers both the project itself and structural changes to its hierarchy.

**Ticket History** is separate and starts from the ticket's creation: created, title changed,
description changed, status changed, type changed, assignment changed, and so on.

**UX reference:** Azure DevOps — a chronological list on the left, details of the selected entry
on the right. This is a reference for the interaction model, not an instruction to copy its
visuals.

---

## 8. Attachments

**Files are uploaded only on Task and Subtask.** Project and Ticket never hold files directly —
they aggregate what their descendants hold.

- **Ticket Attachments** shows files from the ticket's Tasks and their Subtasks.
- **Project Attachments** shows everything anywhere in the project hierarchy.

In an aggregated view the governing question is **"where did this file come from?"**. A filename
alone is not enough. Each row must let the user understand which Task or Subtask it belongs to,
and reach it — the Task/Subtask code and title work as the link.

The hierarchy does not need to be spelled out at equal weight at every level; it needs a compact
representation that answers the question.

Upload is not offered in aggregated views. There the user finds, understands, opens and
downloads.

---

## 9. Current state

**Implemented:** Projects, Groups, Milestones, Tickets, and the interfaces around them.

**Navigation today:** Dashboard, Projects, Users, Organizations.

**Planned, not built:** Kanban, Notifications, Settings.

**Being revisited:** Attachments, History, parts of the Project and Ticket UI.

### Roadmap

Order is expected to be: Tasks → Subtasks → History → Attachments → Comments → Kanban → the
rest. This may change.

**Comments** will need a permission model of their own. Do not assume internal discussion should
be visible to Clients.

**Kanban** must use the existing entities and status workflow, and must continue the BAIM design
language rather than looking like a separate application.
