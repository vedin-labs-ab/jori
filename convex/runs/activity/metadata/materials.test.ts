import { describe, expect, test } from "vitest"
import { activityMaterialId, materialMetadata } from "./materials"

const materialNames = new Map([
  ["store-1", "Dispatch log"],
  ["table-1", "Leads"],
])

describe("activityMaterialId", () => {
  test("resolves store and table references from tool inputs", () => {
    expect(activityMaterialId("write_store", { storeId: "store-1" })).toBe(
      "store-1"
    )
    expect(activityMaterialId("insert_table_row", { tableId: "table-1" })).toBe(
      "table-1"
    )
    expect(activityMaterialId("web_search", { query: "x" })).toBeUndefined()
    expect(activityMaterialId("read_store", undefined)).toBeUndefined()
  })
})

describe("materialMetadata", () => {
  test("names the touched material and labels store write kinds", () => {
    expect(
      materialMetadata({
        materialNames,
        input: {
          storeId: "store-1",
          claim: { path: ["dispatches", "m:1"], value: 1 },
        },
        tool: "write_store",
      })
    ).toEqual([
      { kind: "target", text: "Dispatch log" },
      { kind: "scope", text: "claim dispatches.m:1" },
    ])
  })

  test("falls back to the raw id when the material is not loadable", () => {
    expect(
      materialMetadata({
        materialNames,
        input: { tableId: "table-2" },
        tool: "read_table",
      })
    ).toEqual([{ kind: "target", text: "table-2" }])
  })
})
