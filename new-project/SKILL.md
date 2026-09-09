---
name: new-project
description: Scaffold a new full-stack TypeScript web app the way Bryan builds them - TanStack Start (Router, Query, Form, Table) on React 19, Better Auth, Drizzle on Postgres, Tailwind v4 with shadcn, Vitest, ESLint plus Prettier, a nix dev shell for Postgres, and a feature-slice layout. Use when asked to start, bootstrap, or scaffold a new app or project, or to add a CRUD feature to an app that already follows this layout.
---

# new-project

The reference app is `~/Projects/javascript/closette` (private repo
`apisandipas/closette`). This skill is the distilled version of it, with the
gaps fixed. When the two disagree, follow this skill; closette is the worked
example, not the spec.

Three supporting files hold the detail. Read the one you need rather than all
three:

- [STRUCTURE.md](STRUCTURE.md) - the directory tree, and the plumbing files
  (router, root route, auth guard, auth, db, env, query client, form hook)
  with skeleton code.
- [FEATURE-SLICE.md](FEATURE-SLICE.md) - the recipe for one CRUD feature, from
  schema to routes to tests. Use this on its own when adding a feature to an
  existing app.
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
| Auth | Better Auth | Email and password, Drizzle adapter, `tanstackStartCookies` plugin last |
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

Pin nothing in this skill. Install latest at scaffold time; closette's
`package.json` is the compatibility reference if something breaks.

## Scaffold procedure

Work through these in order. Each step should leave `npm run check` passing.

1. **Ask what is not derivable** before touching anything: the app name, the
   Postgres database name (use the app name), whether image uploads are
   needed (adds B2 and the storage module), and whether there is an admin area
   as well as a user-facing one (closette has both).
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
   `npm run db:generate && npm run db:migrate`. Commit as "Add auth, db, router".
5. **Shell UI.** `npx shadcn@latest init` with the `components.json` from
   CONFIGS.md, then add: button, card, dialog, alert-dialog, dropdown-menu,
   field, input, label, popover, separator, table, tabs. Write the shared
   components listed in STRUCTURE.md (theme provider, toast, confirm dialog,
   data table, page container, catch boundary, not found, dev tools). Add
   login and signup routes and forms. Commit as "Add UI shell and auth pages".
6. **First feature.** Follow FEATURE-SLICE.md once for the app's main entity.
   Commit per feature.
7. **CI.** The workflow in CONFIGS.md runs check on every push and PR. Push to
   GitHub with `gh repo create --private --source=. --push`.

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
  `NumberField`, `SelectField`, `ColorField`, `ImageField`) and
  `SubmitButton` are registered once in `src/lib/form.ts`. Feature forms use
  `withForm` with a shared `formOptions` so the modal and the fields agree on
  defaults and the Zod validator.
- **Schemas derive from tables.** `createInsertSchema`, `createSelectSchema`,
  `createUpdateSchema` from `drizzle-zod`, then `omit` server-owned columns.
  A separate hand-written `*FormSchema` carries the user-facing messages.
- **Tests mock the seams, not the framework.** `src/test/setup.ts` mocks
  `@/lib/db` with a chainable fake, `@/lib/auth/functions` with a fixed
  session, and `createServerFn` with a builder that runs the validator then
  the handler. Service tests then call server functions directly.
- **Generated files are committed and ignored by tools.** `src/routeTree.gen.ts`
  and `drizzle/` are in git; both are in the ESLint and Prettier ignore lists.
- **Server-only code stays out of client bundles.** `src/lib/db`,
  `src/lib/auth/index.ts`, `src/lib/storage`, and `src/lib/env` are imported
  only from server functions and route `server` handlers. The client talks to
  auth through `src/lib/auth/auth-client.ts`.

## Gaps closette has that the scaffold fixes

Apply these when scaffolding, and offer them as a follow-up when working in
closette itself.

- `tsconfig.json` has only `strictNullChecks`. The scaffold uses `strict`,
  `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, and an `include`.
- `package.json` has no `lint`, `format`, `typecheck`, `check`, or `start`
  script, and carries a leftover `"main": "index.js"` and `"license": "ISC"`.
- No formatter config, so format-on-save in Neovim falls back to the
  language server instead of Prettier.
- `.env.example` lists three variables while `src/lib/env.ts` requires eight.
- Two auth guards: `_protected.tsx` and `dashboard/route.tsx` both check the
  session, and the dashboard one drops the `redirect` search param. One guard
  at `_protected` is enough; children read `context.user`.
- `betterAuth()` is not handed `secret` and `baseURL` from the validated env,
  so a missing `BETTER_AUTH_SECRET` is caught by env validation but Better
  Auth would still fall back to reading `process.env` on its own.
- `drizzle.config.ts` imports `dotenv/config` but `dotenv` is not a declared
  dependency; it works only while something hoists it.
- `shell.nix` names the database `dev_db` and `docker-compose.dev.yml` names it
  `closette`. Pick the app name for both.
- `z.string().uuid()` is the Zod 3 spelling; Zod 4 has `z.uuid()`.
- `$id` route params are not validated; `params: { parse }` with a uuid schema
  turns a malformed id into a 404 instead of a database error.
- No CI, no README.
