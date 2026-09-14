---
name: new-project
description: Scaffold a new full-stack TypeScript web app the way Bryan builds them - TanStack Start (Router, Query, Form, Table) on React 19, Better Auth, Drizzle on Postgres, Tailwind v4 with shadcn, Vitest, ESLint plus Prettier, a nix dev shell for Postgres, and a feature-slice layout. Use when asked to start, bootstrap, or scaffold a new app or project, or to add a CRUD feature to an app that already follows this layout.
---

# new-project

This skill is the spec. Do not go looking for a reference app; everything
needed to scaffold is in these files.

Three supporting files hold the detail. Read the one you need rather than all
three:

- [STRUCTURE.md](STRUCTURE.md) - the directory tree, and the plumbing files
  (router, root route, auth guard, auth, db, env, query client, form hook)
  with skeleton code.
- [FEATURE-SLICE.md](FEATURE-SLICE.md) - the recipe for one CRUD feature, from
  schema to routes to tests. Use this on its own when adding a feature to an
  existing app.
- [USER-MGMT.md](USER-MGMT.md) - roles through the Better Auth admin
  plugin, an admin-only users page reached from the user dropdown, and email
  password reset through Mailtrap. Optional; also the recipe for adding it to
  an existing app.
- [CONFIGS.md](CONFIGS.md) - every config file: package.json scripts,
  tsconfig, vite, vitest, eslint, prettier, drizzle, env example, nix shell,
  docker-compose, GitHub Actions.

## The stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | TanStack Start on Vite | File-based routing, SSR, server functions |
| Routing | TanStack Router | Search params validated with Zod, loaders prime the query cache |
| Data | TanStack Query | `queryOptions` factories, key factory per feature, SSR integration |
| Forms | TanStack Form | `createFormHook` with app-wide field components |
| Tables | TanStack Table | Behind one `DataTable` component |
| Auth | Better Auth | Email and password, 12 character minimum, Drizzle adapter, `tanstackStartCookies` plugin last. Optional invite-only signup. Optional `admin` plugin for roles and a users page |
| Email (optional) | Mailtrap SDK | Server-only `src/lib/mail.ts`; password reset is the first use. Sandbox mode for local |
| Database | Drizzle ORM on Postgres | `postgres` driver, `drizzle-kit` migrations committed |
| Validation | Zod 4 | `drizzle-zod` derives insert/select/update schemas from tables |
| Env | `@t3-oss/env-core` | Fails at boot when a variable is missing |
| Styling | Tailwind v4, shadcn (base-luma style, base-ui primitives), lucide icons | Theme tokens as CSS variables in `src/styles.css` |
| Fonts | `@fontsource-variable/*` | Imported in `styles.css` |
| Tests | Vitest, node environment | Server functions tested against a mocked `db`; no component tests by default |
| Lint | ESLint flat config with typescript-eslint, react, `@tanstack/eslint-plugin-router`, `eslint-config-prettier` last | Lint only |
| Format | Prettier with `prettier-plugin-tailwindcss` | Never add a `biome.json`: Bryan's Neovim would switch to Biome and skip Prettier |
| Typecheck | `tsgo` from `@typescript/native-preview` | `tsc` fallback is fine |
| Dev DB | Postgres from a nix shell, data under `.direnv/` | `docker-compose.dev.yml` as the non-nix alternative |
| Storage (optional) | Backblaze B2 through the S3 SDK | Presigned PUT, `HEAD` to verify before trusting a key |
| Deploy | Render from a committed `render.yaml` | `nitro` Vite plugin, `NITRO_PRESET=render-com`, migrations in `preDeployCommand` |

Pin nothing in this skill. Install latest at scaffold time.

## Scaffold procedure

Work through these in order. Each step should leave `npm run check` passing.

1. **Ask what is not derivable** before touching anything: the app name, the
   Postgres database name (use the app name), whether image uploads are
   needed (adds B2 and the storage module), whether signup is invite-only
   (the first account bootstraps, after that only a signed-in user can add
   one), whether there is an admin area as well as a user-facing one, and
   whether the app manages users (roles, a users page, password reset email;
   see USER-MGMT.md).
2. **Init the repo and toolchain.** `git init -b main`, then write every file
   in CONFIGS.md. Run `npm install` for the dependency list there. Commit as
   "Scaffold toolchain".
3. **Dev database.** Enter the nix shell (`nix-shell` or `direnv allow` with a
   `.envrc` of `use nix`). Confirm `psql -h localhost -U postgres -l` lists the
   database. Fill `.env` from `.env.example`.
4. **Plumbing.** Write the files in STRUCTURE.md under `src/lib`, `src/router.tsx`,
   `src/routes/__root.tsx`, `src/routes/_protected.tsx`, and
   `src/routes/api/auth/$.ts`. Generate the Better Auth tables with
   `npx @better-auth/cli generate` into `src/lib/db/auth-schema.ts`, then
   `npm run db:generate && npm run db:migrate`. With user management, add
   `mail.ts`, `roles.ts`, the admin plugin, and its columns first (USER-MGMT.md
   steps 1 to 4) so the migration lands once. Commit as "Add auth, db, router".
5. **Shell UI.** `npx shadcn@latest init` with the `components.json` from
   CONFIGS.md, then add: button, card, dialog, alert-dialog, dropdown-menu,
   field, input, label, popover, separator, table, tabs. Write the shared
   components listed in STRUCTURE.md (theme provider, toast, confirm dialog,
   data table, page container, catch boundary, not found, dev tools). Add
   login and signup routes and forms, plus the forgot and reset password
   routes when there is user management. Commit as "Add UI shell and auth
   pages".
6. **First feature.** Follow FEATURE-SLICE.md once for the app's main entity.
   Commit per feature. The users feature follows USER-MGMT.md instead.
7. **CI and deploy.** The workflow in CONFIGS.md runs check on every push and
   PR. Push to GitHub with `gh repo create --private --source=. --push`. The
   `render.yaml` in CONFIGS.md is already in the repo with the app name filled
   in; deploying is creating a Blueprint on Render from it and filling the
   `sync: false` variables.

## Conventions that are not obvious from the code

- **Feature slices, not layers.** `src/features/<name>/api` holds the server
  functions, query options, mutation hooks, form options, and types for one
  entity. `src/features/<name>/components` holds its UI. Routes under
  `src/routes` are thin: validate search, run the loader, render a feature
  component. Cross-feature helpers go in `src/features/common`.
- **The session is the only source of `userId`.** Every server function calls
  `ensureSession()` and scopes reads and writes with `eq(table.userId, user.id)`.
  Insert schemas `omit` `userId`; tests assert a client-supplied `userId` is
  ignored. Ownership of foreign keys is checked with a `findFirst` before
  insert or update.
- **URL state over component state.** Paging, search, and sort live in
  validated search params. The route's `loaderDeps` are the search params and
  the loader calls `ensureQueryData` so the page renders with data on first
  paint. Components read them with `getRouteApi(routeId)` to avoid the
  circular import a direct `Route` import would create.
- **Modals are routes.** `new` and `$id/edit` are child routes of a `_list`
  pathless layout that renders the table plus an `<Outlet />`. The modal is
  open while its route is matched; every dismissal navigates to the list.
- **Toasts come from mutation meta.** `makeQueryClient` installs a
  `MutationCache` that reads `meta.successMessage` and `meta.errorMessage`.
  Mutation hooks set meta and invalidate `keys.all`; components never call
  `toast` directly for mutation outcomes.
- **Query keys through one factory.** `makeKeys(name)` gives `all`, `lists()`,
  `list(filters)`, `details()`, `detail(id)` following the tkdodo pattern.
- **Forms through `useAppForm`.** Field components (`TextField`,
  `NumberField`, `SelectField`, and `ImageField` with uploads) and
  `SubmitButton` are registered once in `src/lib/form.ts`. A `ColorField` on
  `react-colorful` is optional; add one only when the app needs it.
  Feature forms use `withForm` with a shared `formOptions` so the modal and
  the fields agree on defaults and the Zod validator.
- **Schemas derive from tables.** `createInsertSchema`, `createSelectSchema`,
  `createUpdateSchema` from `drizzle-zod`, then `omit` server-owned columns.
  A separate hand-written `*FormSchema` carries the user-facing messages.
- **Tests mock the seams, not the framework.** `src/test/setup.ts` mocks
  `@/lib/db` with a chainable fake, `@/lib/auth/functions` with a fixed
  session, `@/lib/storage` when there are uploads, and `createServerFn` with
  a builder that runs the validator then the handler. Service tests then call
  server functions directly.
- **Signup can be invite-only.** A `before` hook in `src/lib/auth/index.ts`
  rejects `/sign-up/email` unless the `user` table is empty or the caller has
  a session. `isSignupOpen()` in `src/lib/auth/functions.ts` answers the same
  question for the `/signup` route's `beforeLoad`, which redirects to `/login`
  when closed. Never move `/signup` under `_protected`: that blocks the first
  signup. A signed-in user adds an account by visiting `/signup`.
- **Roles come from the admin plugin, not a column you manage.** `ROLES` in
  `src/lib/auth/roles.ts` is the one list; the first account is made admin by
  a `databaseHooks.user.create.before` hook; the users service calls
  `auth.api.*` with the request headers so Better Auth does the admin check.
- **User management is not part of the admin area.** The admin sidebar lists
  the product's entities. The users page lives at `/users` with its own
  header, guarded on `context.user.role`, and is reached from the user
  dropdown, shown only to admins.
- **Password reset is email-driven.** `sendResetPassword` in `betterAuth()`
  mails the link; `/forgot-password` and `/reset-password` stay public. An
  admin can also send one from the users table.
- **Password minimum is 12 on both sides.** `minPasswordLength: 12` in
  `betterAuth()` and `z.string().min(12)` in the login and signup forms.
- **Generated files are committed and ignored by tools.** `src/routeTree.gen.ts`
  and `drizzle/` are in git; both are in the ESLint and Prettier ignore lists.
- **Server-only code stays out of client bundles.** `src/lib/db`,
  `src/lib/auth/index.ts`, `src/lib/storage`, and `src/lib/env` are imported
  only from server functions and route `server` handlers. The client talks to
  auth through `src/lib/auth/auth-client.ts`.
