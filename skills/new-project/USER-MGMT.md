# User management

Roles, an admin-only users page, and email password reset. Optional: ask at
scaffold time. The users page lives outside the admin sidebar (see step 7).

Better Auth owns the `user` table and the user endpoints. The app adds
nothing to the database beyond the admin plugin's columns, and every server
function forwards the request cookies so the plugin does the admin check.

## 1. Email: src/lib/mail.ts

Mailtrap through its SDK (`npm install mailtrap`). Server only.

```ts
import { MailtrapClient } from "mailtrap";
import { env } from "@/lib/env";

if (env.MAILTRAP_USE_SANDBOX && !env.MAILTRAP_INBOX_ID) {
  throw new Error("MAILTRAP_USE_SANDBOX needs MAILTRAP_INBOX_ID");
}

const client = new MailtrapClient({
  token: env.MAILTRAP_TOKEN,
  sandbox: env.MAILTRAP_USE_SANDBOX,
  testInboxId: env.MAILTRAP_INBOX_ID,
});

export async function sendMail(to: string, subject: string, text: string) {
  await client.send({
    from: { email: env.MAILTRAP_FROM, name: "APP" },
    to: [{ email: to }],
    subject,
    text,
  });
}
```

Env keys, added to `env.ts`, `.env.example`, and `render.yaml`:

```ts
MAILTRAP_TOKEN: z.string(),
MAILTRAP_FROM: z.email().default("noreply@APP.test"),
MAILTRAP_USE_SANDBOX: z.stringbool().default(false),
MAILTRAP_INBOX_ID: z.coerce.number().optional(), // sandbox only
```

Sandbox on in `.env` sends into a Mailtrap testing inbox instead of
delivering. Off in production; `MAILTRAP_FROM` must be on a domain verified in
Mailtrap.

## 2. Roles: src/lib/auth/roles.ts

```ts
// Shared by server and client; keep it free of server imports.
export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];
```

## 3. Auth: src/lib/auth/index.ts

Three additions to the skeleton in STRUCTURE.md:

```ts
import { admin } from "better-auth/plugins";
import { sendMail } from "@/lib/mail";

emailAndPassword: {
  enabled: true,
  minPasswordLength: 12,
  sendResetPassword: ({ user, url }) =>
    sendMail(
      user.email,
      "Reset your APP password",
      `Set a new password here: ${url}\n\nThe link expires in an hour. If you did not ask for this, ignore this email.`,
    ),
},
databaseHooks: {
  user: {
    create: {
      // The bootstrap account is the first admin.
      before: async (data) =>
        (await userCount()) === 0 ? { data: { ...data, role: "admin" } } : undefined,
    },
  },
},
plugins: [
  admin({ defaultRole: "user", adminRoles: ["admin"] }),
  tanstackStartCookies(), // must stay last
],
```

`userCount()` is the same `count()` select the invite-only hook uses; share
it. No client plugin is needed: the browser never calls admin endpoints
directly, and `role` reaches the client through `context.user` from the
`_protected` guard.

## 4. Schema and migration

Add the admin plugin's columns to `user` in `auth-schema.ts`:

```ts
// Admin plugin fields.
role: text("role"),
banned: boolean("banned").default(false),
banReason: text("ban_reason"),
banExpires: timestamp("ban_expires"),
```

Run `npm run db:generate`. When adding this to an app that already has
accounts, append one statement to the generated migration so the deploy
promotes the oldest account and nobody has to reach the production database
by hand:

```sql
--> statement-breakpoint
UPDATE "user" SET role = 'admin' WHERE id = (SELECT id FROM "user" ORDER BY created_at LIMIT 1);
```

## 5. Password reset routes

Two public routes outside `_protected`, each a centered card like `/login`.

- `/forgot-password` - one email field. Submits
  `authClient.requestPasswordReset({ email, redirectTo: "/reset-password" })`
  and then shows "check your email" whatever the result, so the form does not
  reveal which addresses exist.
- `/reset-password` - Better Auth lands here with `?token=` or
  `?error=INVALID_TOKEN`. `validateSearch` takes both as optional strings;
  `beforeLoad` redirects to `/forgot-password` when `token` is missing. The
  form has new password and confirm fields (12 minimum, must match) and
  submits `authClient.resetPassword({ newPassword, token })`, then navigates
  to `/login`.

The login form gets a "Forgot your password?" link beside the password label.

## 6. Users feature: src/features/users

Same slice shape as FEATURE-SLICE.md, with these differences.

**types.ts** is hand-written; there is no drizzle-zod here because Better
Auth owns the table.

```ts
import type { UserWithRole } from "better-auth/plugins/admin";
export type User = UserWithRole;

const password = z.string().min(12, "Password must be at least 12 characters");

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid email"),
  role: z.enum(ROLES),
  password,
});
export type UserFormValues = z.infer<typeof createUserSchema>;

// Blank password means "leave it alone".
export const editUserFormSchema: z.ZodType<UserFormValues, UserFormValues> =
  createUserSchema.extend({ password: password.or(z.literal("")) });
export const updateUserSchema = createUserSchema.extend({
  id: z.string().min(1),
  password: password.or(z.literal("")),
});
```

**service.ts** calls `auth.api.*` instead of `db`, always with
`headers: getRequestHeaders()` so the admin plugin sees the caller's session:

| Function | Better Auth call |
|---|---|
| `getUsers` | `listUsers` with `limit`, `offset`, `sortBy: "createdAt"`, and `searchField: "email"` when `search` is set |
| `getUser` | `getUser`; a `NOT_FOUND` `APIError` becomes `{ user: null }` |
| `createUser` | `createUser` |
| `updateUser` | `adminUpdateUser`, then `setUserPassword` only when `password` is non-blank |
| `deleteUser` | `removeUser` |
| `sendPasswordReset` | `requestPasswordReset` with `redirectTo: "/reset-password"`; the `sendResetPassword` hook mails it |

**mutations.ts** adds `useSendPasswordReset` (no invalidation, just toast
meta) to the usual create, update, delete hooks.

**components**: `user-form.tsx` has name, email, a role `SelectField` over
`ROLES`, and a password `TextField` whose label is "Password" on create and
"New password (blank to keep)" on edit. `user-form-modal.tsx` takes a
`mode: "create" | "edit"` prop and picks the matching schema.
`users-table.tsx` adds a display column with a "Send password reset" icon
button that goes through `useConfirm()`, and `removeRow` refuses the
signed-in user's own row (`route.useRouteContext().user.id`).

`TextField` needs `type` and `autoComplete` props for this; add them if the
scaffold's field component does not have them.

## 7. Routes: src/routes/_protected/users

Not under `admin`. The admin sidebar is for the product's own entities; user
management is reached from the user dropdown in the app header, and the page
carries its own copy of that header rather than the admin layout.

```
route.tsx          validateSearch: searchFiltersSchema, loaderDeps, loader (as _list.tsx elsewhere)
                   beforeLoad: ({ context }) => { if (context.user.role !== "admin") throw redirect({ to: "/dashboard" }) }
                   renders header (logo, ThemeToggle, UserDropdown) + PageContainer(UsersListing, Outlet)
index.tsx          component: () => null
new.tsx            useCreateUser(); <UserFormModal mode="create" ... />
$userId/edit.tsx   loader throws notFound() when getUser returns null; <UserFormModal mode="edit" ... />
```

`getRouteApi("/_protected/users")` in the listing and table. The dropdown
adds a "Users" item only when `isAdmin`; the dashboard layout passes
`Route.useRouteContext().user.role === "admin"`. The route guard is the real
gate on the client; Better Auth rejects non-admins on the endpoints.

## 8. Tests

`src/test/mocks.ts` exports an `auth` fake:

```ts
export const auth = {
  api: {
    listUsers: vi.fn(async () => ({ users: [], total: 0 })),
    getUser: vi.fn(),
    createUser: vi.fn(async () => ({ user: { id: "u2" } })),
    adminUpdateUser: vi.fn(async () => ({ id: "u2" })),
    setUserPassword: vi.fn(async () => ({ status: true })),
    removeUser: vi.fn(async () => ({ success: true })),
    requestPasswordReset: vi.fn(async () => ({ status: true })),
  },
};
```

`setup.ts` mocks two more seams:

```ts
vi.mock("@/lib/auth", async () => ({ auth: (await import("./mocks")).auth }));
vi.mock("@tanstack/react-start/server", () => ({
  getRequestHeaders: () => new Headers(),
}));
```

`service.test.ts` covers: list maps page to offset and search to email and
rounds `pageCount` up; create rejects a short password and an unknown role;
update skips `setUserPassword` when the password is blank and calls it when
given; `sendPasswordReset` asks Better Auth for a token with the right
`redirectTo`.

## Checklist

- `MAILTRAP_TOKEN` and `MAILTRAP_FROM` set in Render before the deploy
- migration carries the `UPDATE` when accounts already exist
- `/signup` and the two reset routes stay outside `_protected`
- the users route guards on `context.user.role`, not just the session
- `tanstackStartCookies()` is still last in `plugins`
