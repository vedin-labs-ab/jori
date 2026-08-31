// Collection row fixtures for unit tests that run against the in-memory
// database. Overrides refine any field, including kind-specific ones.

type PersonId = import("../../convex/_generated/dataModel").Id<"persons">

export const testOwner = "persons:owner" as PersonId

/** A collections row shaped like a table. */
export function tableDoc(overrides: Record<string, unknown> = {}) {
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
export function storeDoc(overrides: Record<string, unknown> = {}) {
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
