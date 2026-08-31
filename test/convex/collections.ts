import { type WithoutSystemFields } from "convex/server"

// Collection row fixtures — tables, stores, and the shares that point at
// them — for unit tests that run against the in-memory database. Overrides
// refine any field of the row's own kind, so a field the schema has retired
// fails typecheck instead of passing silently.

// dataModel only ships types, so it is referenced through import types: a
// value-position import statement would survive transpilation and fail to
// resolve at test runtime.
type DataModel = import("../../convex/_generated/dataModel").DataModel
type Doc<TableName extends keyof DataModel> =
  import("../../convex/_generated/dataModel").Doc<TableName>
type PersonId = import("../../convex/_generated/dataModel").Id<"persons">

type CollectionOverrides<TKind extends Doc<"collections">["kind"]> = Partial<
  WithoutSystemFields<Extract<Doc<"collections">, { kind: TKind }>>
>

export type TableOverrides = CollectionOverrides<"table">
export type StoreOverrides = CollectionOverrides<"store">
export type ShareOverrides = Partial<WithoutSystemFields<Doc<"shares">>>

export const testOwner = "persons:owner" as PersonId

/** A collections row shaped like a table. */
export function tableDoc(overrides: TableOverrides = {}) {
  return {
    organizationId: "org",
    visibility: { mode: "organization" },
    ownerId: testOwner,
    kind: "table",
    name: "Leads",
    columns: [{ id: "title", name: "Title", type: "string" }],
    schemaHash: "hash",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

/** A collections row shaped like a store. */
export function storeDoc(overrides: StoreOverrides = {}) {
  return {
    organizationId: "org",
    visibility: { mode: "organization" },
    ownerId: testOwner,
    kind: "store",
    name: "Settings",
    schema: { type: "object" },
    schemaHash: "hash",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}
