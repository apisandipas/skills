---
name: new-project
description: Scaffold a new full-stack TypeScript web app the way Bryan builds them - TanStack Start (Router, Query, Form, Table) on React 19, Better Auth, Drizzle on Postgres, Tailwind v4 with shadcn, Vitest, ESLint plus Prettier, a nix dev shell for Postgres, and a feature-slice layout. Use when asked to start, bootstrap, or scaffold a new app or project, or to add a CRUD feature to an app that already follows this layout.
---

# new-project

The template repo is the spec: `apisandipas/tanstack-template` on GitHub,
checked out locally at `~/Dev/skilltest`. It is a small working app, its CI
runs the scaffold script on every push, and its `docs/` folder holds the
conventions and the feature recipe. Nothing in this skill duplicates it, so
nothing here can drift.

## Start a new app

1. Ask for the app name (lowercase, hyphens allowed). Nothing else is needed
   up front; the template ships every optional piece and the app runs with
   placeholder B2 and Mailtrap values.
2. Confirm before creating the GitHub repo, then:

   ```sh
   gh repo create <name> --private --template apisandipas/tanstack-template --clone
   cd <name>
   scripts/init.sh <name>
   ```

   The script renames the app, removes the `notes` example, regenerates the
   migration and route tree, runs `npm run check`, and deletes itself.
3. Follow "Getting started" in the README: nix shell, `.env`, migrate, dev.
4. Commit as "Start <name> from tanstack-template".
5. Add the first entity with `docs/FEATURE-SLICE.md`. Read
   `docs/CONVENTIONS.md` before writing code. For anything larger than one
   slice, write `docs/specs/<feature>.md` from `docs/specs/TEMPLATE.md` and
   review it with Bryan before building.

## Add a feature to an existing app

Read the app's own `docs/FEATURE-SLICE.md` and `docs/CONVENTIONS.md`; they
match that app's version of the pattern. An app that predates the template
has no `docs/`; use the copies in `~/Dev/skilltest/docs` and note the
differences.

## Change the pattern

Change the template, not this skill. `npm update` there and let CI prove
the result; apps started earlier keep their lockfile.
