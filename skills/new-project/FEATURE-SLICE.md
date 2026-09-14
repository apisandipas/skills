# Adding a CRUD feature

One entity, called `thing` here, owned by a user, listed in an admin table
with search and paging, created and edited in a route-driven modal. Work top
to bottom; each step compiles on its own.

## 1. Table: src/lib/db/<domain>-schema.ts

Add the `pgTable` following the shape in STRUCTURE.md, add its `relations`,
export it from `schema.ts`, then:

```sh
npm run db:generate   # writes drizzle/NNNN_*.sql + meta
npm run db:migrate
```

Add `thing: table()` to `db.query` in `src/test/mocks.ts`.

## 2. Types: src/features/things/api/types.ts

```ts
export type Thing = typeof thing.$inferSelect;
export type NewThing = typeof thing.$inferInsert;

export const insertThingSchema = createInsertSchema(thing).omit({
  id: true, userId: true, createdAt: true, updatedAt: true,
});
export const selectThingSchema = createSelectSchema(thing);
export const updateThingSchema = createUpdateSchema(thing)
  .omit({ userId: true, createdAt: true, updatedAt: true })
  .partial()
  .extend({ id: z.uuid() });

// User-facing messages live here, not in the derived schemas.
export const thingFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
});
export type ThingFormValues = z.infer<typeof thingFormSchema>;
```

If the list endpoint decorates rows (counts, joined names), declare that
type here too, for example `ThingWithCount = Thing & { itemCount: number }`.

## 3. Server functions: src/features/things/api/service.ts

Five functions, each `createServerFn` with a `.validator(zodSchema)` and a
handler that starts with `const { user } = await ensureSession()`.

```ts
export const getThings = createServerFn({ method: "GET" })
  .validator(searchFiltersSchema)
  .handler(async ({ data: { page, limit, search, sort } }) => {
    const { user } = await ensureSession();
    const where = and(
      eq(thing.userId, user.id),
      search ? ilike(thing.name, `%${search}%`) : undefined,
    );
    const [rows, totals] = await Promise.all([
      db.query.thing.findMany({
        where, limit, offset: (page - 1) * limit,
        orderBy: sort === "name" ? asc(thing.name) : desc(thing.createdAt),
      }),
      db.select({ value: count() }).from(thing).where(where),
    ]);
    const total = totals[0]?.value ?? 0;
    return { things: rows, total, page, limit, pageCount: Math.max(1, Math.ceil(total / limit)) };
  });

export const getThing = createServerFn({ method: "GET" })
  .validator(selectThingSchema.pick({ id: true }))
  .handler(async ({ data: { id } }) => {
    const { user } = await ensureSession();
    const found = await db.query.thing.findFirst({
      where: and(eq(thing.id, id), eq(thing.userId, user.id)),
    });
    return { thing: found };
  });

export const createThing = createServerFn({ method: "POST" })
  .validator(insertThingSchema)
  .handler(async ({ data }) => {
    const { user } = await ensureSession();
    // Check ownership of any foreign key in `data` with a findFirst here.
    const [created] = await db.insert(thing).values({ ...data, userId: user.id }).returning();
    if (!created) throw new Error("Thing not created");
    return { thing: created };
  });

export const updateThing = createServerFn({ method: "POST" })
  .validator(updateThingSchema)
  .handler(async ({ data: { id, ...changes } }) => {
    const { user } = await ensureSession();
    const [updated] = await db.update(thing).set(changes)
      .where(and(eq(thing.id, id), eq(thing.userId, user.id))).returning();
    if (!updated) throw new Error("Thing not found");
    return { thing: updated };
  });

export const deleteThing = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data: { id } }) => {
    const { user } = await ensureSession();
    const [deleted] = await db.delete(thing)
      .where(and(eq(thing.id, id), eq(thing.userId, user.id))).returning({ id: thing.id });
    if (!deleted) throw new Error("Thing not found");
    return { id: deleted.id };
  });
```

## 4. Queries and mutations

```ts
// queries.ts
export const thingKeys = makeKeys("thing");
export const thingsQueryOptions = (filters: Filters) =>
  queryOptions({ queryKey: thingKeys.list(filters), queryFn: () => getThings({ data: filters }) });
export const thingQueryOptions = (id: string) =>
  queryOptions({ queryKey: thingKeys.detail(id), queryFn: () => getThing({ data: { id } }) });

// mutations.ts - one hook per write, same shape each time
export function useCreateThing() {
  const queryClient = useQueryClient();
  const fn = useServerFn(createThing);
  return useMutation({
    mutationFn: fn,
    meta: { successMessage: "Thing created", errorMessage: "Thing not created" },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: thingKeys.all }),
  });
}
// useUpdateThing, useDeleteThing follow the same pattern.
```

## 5. Form: src/features/things/api/form.ts

```ts
export const thingFormOpts = formOptions({
  defaultValues: { name: "" } as ThingFormValues,
  validators: { onSubmit: thingFormSchema },
});
```

## 6. Components: src/features/things/components

- `thing-form.tsx` - `withForm({ ...thingFormOpts, render: ({ form }) => <FieldGroup>...<form.AppField name="name">{(f) => <f.TextField label="Name" />}</form.AppField></FieldGroup> })`.
- `thing-form-modal.tsx` - props `title`, `description?`, `submitLabel`,
  `defaultValues?`, `onSubmit`. Builds the form with `useAppForm`, renders a
  shadcn `Dialog` that is always `open`, and on any close navigates to the
  list route. Submit awaits `onSubmit(value)` then closes.
- `things-table.tsx` - columns via `createDataTableColumnHelper<Thing>()`,
  `openRow` navigates to the edit route, `removeRow` goes through `useConfirm()`
  then the delete mutation. Renders `DataTable` with `pagination` and
  `search` props.
- `things-listing.tsx` - `const route = getRouteApi("/_protected/admin/things/_list")`,
  reads `route.useSearch()`, `useSuspenseQuery(thingsQueryOptions(search))`,
  and maps page and search changes to `navigate({ search: prev => ... })`.
  A search change resets `page` to 1.

## 7. Routes: src/routes/_protected/admin/things

```
_list.tsx              validateSearch: searchFiltersSchema
                       loaderDeps: ({ search }) => search
                       loader: ensureQueryData(thingsQueryOptions(deps))
                       renders <PageContainer title action={<NewButton to=".../new"/>}>
                         <ThingsListing /> <Outlet />
_list/index.tsx        component: () => null
_list/new.tsx          useCreateThing(); <ThingFormModal onSubmit={v => mutateAsync({ data: v })} />
_list/$thingId/edit.tsx params: { parse: (p) => ({ thingId: z.uuid().parse(p.thingId) }) }
                       loader: ensureQueryData(thingQueryOptions(params.thingId))
                       useSuspenseQuery, useUpdateThing(), modal with defaultValues
```

Add the entry to the admin sidebar. Run `npm run dev` once so the route tree
regenerates, and commit `src/routeTree.gen.ts` with the feature.

## 8. Tests: src/features/things/api/service.test.ts

Import `db` from `@/test/mocks` and call the server functions directly. The
minimum set, mirroring closette:

- create saves `userId` from the session and ignores one in the request
- update throws when no row matched, ignores `userId`, rejects a non-uuid id
- delete returns the id, throws when no row matched
- list returns any decorated fields and rounds `pageCount` up

Resolve `db.returning` for writes and `db.query.thing.findMany` plus
`db.where` (for the count) for the list.

## Checklist before committing

- `npm run check` passes (typecheck, lint, test)
- every server function scopes by `user.id`
- `.omit({ userId })` on insert and update schemas
- new table has an index on each foreign key
- migration committed alongside the schema change
- `mocks.ts` knows the new table
