import { expect, test } from "vitest"
import { storeDoc } from "../../test/convex/collections"
import { id } from "../../test/convex/database"
import { schemaViolations } from "../../test/convex/schema"
import { storeToolResponseSchemas } from "../runs/agent/tools/schemas/responses/jori/stores"
import { summarizeStore } from "./access"

test("store response contracts include schema counts and containing folders", () => {
  const store = {
    ...storeDoc(),
    _id: id<"collections">("store"),
    _creationTime: 1,
    folderId: id<"folders">("folder"),
    visibility: { mode: "teams" as const, teamIds: ["team"] },
    kind: "store" as const,
  }
  const summary = JSON.parse(JSON.stringify(summarizeStore(store)))
  expect(summary.propertyCount).toBe(0)
  expect(
    schemaViolations(summary, storeToolResponseSchemas.create_store)
  ).toEqual([])
  expect(
    schemaViolations([summary], storeToolResponseSchemas.search_stores)
  ).toEqual([])
  expect(
    schemaViolations(
      { ...summary, value: null, version: 0 },
      storeToolResponseSchemas.read_store
    )
  ).toEqual([])
})
