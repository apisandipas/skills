# Config files

Every file outside `src/`. Replace `APP` with the app name. Versions are not
pinned here on purpose; install latest and consult closette's `package.json`
if a combination misbehaves.

## package.json

```jsonc
{
  "name": "APP",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "start": "node .output/server/index.mjs",
    "typecheck": "tsgo --noEmit",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "check": "npm run typecheck && npm run lint && npm run format:check && npm run test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

Dependencies:

```
react react-dom
@tanstack/react-start @tanstack/react-router @tanstack/react-router-ssr-query
@tanstack/react-query @tanstack/react-form @tanstack/react-form-start
@tanstack/react-table @tanstack/react-pacer
@tanstack/react-devtools @tanstack/react-router-devtools
@tanstack/react-query-devtools @tanstack/react-form-devtools @tanstack/devtools-a11y
better-auth @better-auth/drizzle-adapter
drizzle-orm drizzle-zod postgres zod @t3-oss/env-core dotenv
tailwindcss @tailwindcss/vite tw-animate-css shadcn @base-ui/react
class-variance-authority clsx tailwind-merge lucide-react
@fontsource-variable/inter @fontsource-variable/space-grotesk
```

Only with uploads: `@aws-sdk/client-s3 @aws-sdk/s3-request-presigner react-dropzone`.

Dev dependencies:

```
typescript @typescript/native-preview @types/node @types/react @types/react-dom
vite @vitejs/plugin-react vitest jiti
eslint @eslint/js typescript-eslint eslint-plugin-react globals @tanstack/eslint-plugin-router
eslint-config-prettier prettier prettier-plugin-tailwindcss drizzle-kit
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "*.config.ts"]
}
```

## vite.config.ts

```ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: { port: 3000 },
  resolve: { tsconfigPaths: true },
  // React's plugin must come after Start's.
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
});
```

## vitest.config.ts

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

## eslint.config.ts

Flat config. Ignore `dist`, `.output`, `.tanstack`, `.nitro`,
`src/routeTree.gen.ts`, `drizzle`. Extend, in order:
`pluginRouter.configs["flat/recommended"]`, `js/recommended`,
`tseslint.configs.recommended`, `pluginReact.configs.flat.recommended`,
`pluginReact.configs.flat["jsx-runtime"]`, and `eslint-config-prettier`
last. Then for `**/*.{ts,tsx}`:

```ts
settings: { react: { version: "detect" } },
rules: {
  "react/prop-types": "off",
  "react/no-unescaped-entities": "off",
  "@typescript-eslint/no-unused-vars": ["warn", {
    argsIgnorePattern: "^_", varsIgnorePattern: "^_",
    caughtErrorsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_",
  }],
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/no-empty-object-type": "warn",
}
```

`jiti` is what lets ESLint load a `.ts` config.

## .prettierrc and .prettierignore

Prettier formats; ESLint lints. Do not add a `biome.json`: Bryan's Neovim
hands formatting to Biome whenever that file exists at the repo root and
skips Prettier entirely.

```json
{
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

Prettier defaults otherwise. The Tailwind plugin sorts class names in the
order Tailwind emits them, which is the only formatting decision worth
automating in this stack.

`.prettierignore`:

```
dist
.output
.tanstack
.nitro
drizzle
src/routeTree.gen.ts
```

`eslint-config-prettier` goes last in the ESLint config so no lint rule
argues with the formatter.

## drizzle.config.ts

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

`dotenv` is a declared dependency. drizzle-kit runs outside Vite, so nothing
else loads `.env` for it.

## components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-luma",
  "rsc": false,
  "tsx": true,
  "tailwind": { "config": "", "css": "src/styles.css", "baseColor": "mauve", "cssVariables": true, "prefix": "" },
  "iconLibrary": "lucide",
  "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" }
}
```

`src/styles.css` starts with `@import "tailwindcss"; @import "tw-animate-css";
@import "shadcn/tailwind.css";` then the font imports, then
`@custom-variant dark (&:is(.dark *));` and the `:root` / `.dark` token blocks
shadcn generates.

## .env.example

One line per key in `src/lib/env.ts`, values blank except URLs with a local
default:

```
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/APP
```

Plus the five `B2_*` keys when uploads are on. Generate the secret with
`openssl rand -base64 32`.

## .gitignore

```
node_modules
.env
.direnv
.tanstack
.output
.nitro
dist
```

## shell.nix and .envrc

`.envrc` is one line: `use nix`. `shell.nix` pins a nixpkgs commit with
`fetchTarball` so every machine gets the same Postgres major, and provides
`nodejs` and `postgresql`. Its `shellHook`:

1. Sets `PGDATA=$PWD/.direnv/postgres`, `PGSOCK=$PWD/.direnv/postgres_sockets`,
   `DATABASE_URL=postgres://postgres:postgres@localhost:5432/APP`, and
   `DUMPFILE=$PWD/db/APP.sql`.
2. Runs `initdb --auth=trust --no-locale -U postgres` on first entry and
   points `unix_socket_directories` at `PGSOCK`.
3. Starts Postgres with `pg_ctl -o "-k $PGSOCK" -l "$PGDATA/server.log" start`
   and creates database `APP` if missing.
4. Defines `db-dump` (pg_dump `--clean --if-exists`, excluding
   `session` and `verification` table data, written to a temp file then moved
   into place) and `db-restore` (psql `--single-transaction -v ON_ERROR_STOP=1`).
5. Auto-restores the dump only when the database has zero public tables.
6. Traps EXIT to `pg_ctl stop -m fast`.

closette's `shell.nix` is the complete reference for this and can be copied
with the database name changed.

## docker-compose.dev.yml

For a machine without nix. Same database name and credentials as the shell.

```yaml
services:
  db:
    image: postgres:17-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: APP
```

## .github/workflows/ci.yml

```yaml
name: ci
on:
  push: { branches: [main] }
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check
      - run: npm test
      - run: npm run build
```

Tests run against the mocked `db`, so CI needs no Postgres service. Add one
only if integration tests appear.

## README.md

Short: what the app is, `nix-shell` or `direnv allow` to get Postgres, copy
`.env.example` to `.env`, `npm install`, `npm run db:migrate`, `npm run dev`.
Point at `db-dump` and `db-restore` for sharing dev data between machines.
