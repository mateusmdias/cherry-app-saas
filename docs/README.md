# Project documentation

This folder stores discovery artifacts, stakeholder Q&A, and product specs for the cherry-app-saas project.

## Structure

| Path | Purpose |
|------|---------|
| [stakeholder-discovery/](stakeholder-discovery/) | Interview guides, response templates, and recorded stakeholder answers |
| [stakeholder-discovery/responses/2026-05-18-tatiane-corcini.md](stakeholder-discovery/responses/2026-05-18-tatiane-corcini.md) | Completed owner interview (archived) |
| [prd/mvp-v1.md](prd/mvp-v1.md) | MVP product requirements derived from discovery |
| [implementation-plan.md](implementation-plan.md) | Phased build plan (GitHub, Supabase, Vercel) |
| [technical-constraints.md](technical-constraints.md) | Stack and implementation constraints agreed for the project |

## How to use stakeholder discovery

1. Schedule sessions with each stakeholder type (owner, baker/ops, customers if possible).
2. Use [01-stakeholder-interview-guide.md](stakeholder-discovery/01-stakeholder-interview-guide.md) as the question script.
3. Copy [02-interview-response-template.md](stakeholder-discovery/02-interview-response-template.md) per session, fill in answers, and save as `stakeholder-discovery/responses/YYYY-MM-DD-<stakeholder-name>.md`.
4. Synthesize themes into a PRD or backlog once interviews are complete.

**Current status:** Auth + dashboard + **Customers** + **Products** (catalog, fixed/quote pricing, variable groups & choices) — next: **Estimates** (Phase 4).

## Technical stack (summary)

- **Frontend:** React, TypeScript
- **HTTP client:** native `fetch` only — **do not use axios**

See [technical-constraints.md](technical-constraints.md) for full details.
