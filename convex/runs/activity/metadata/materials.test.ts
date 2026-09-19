import { describe, expect, test } from "vitest"
import {
  activityFileIds,
  activityMaterialId,
  materialMetadata,
} from "./materials"

const materialNames = new Map([
  ["store-1", "Dispatch log"],
  ["table-1", "Leads"],
  ["file-1", "August invoices.csv"],
  ["file-2", "Renewal brief.md"],
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

describe("file access", () => {
  test("finds a file tool's own file and the files any tool sends", () => {
    expect(activityFileIds("read_file", { fileId: "file-1" })).toEqual([
      "file-1",
    ])
    expect(
      activityFileIds("slack_send_message", {
        files: [{ fileId: "file-1" }, { fileId: "file-2" }, { name: "x" }],
      })
    ).toEqual(["file-1", "file-2"])
    expect(activityFileIds("web_search", { fileId: "file-1" })).toEqual([])
  })

  test("names the file a tool read or shared", () => {
    expect(
      materialMetadata({
        materialNames,
        input: { fileId: "file-1", expiresInHours: 24 },
        tool: "share_file",
      })
    ).toEqual([
      { kind: "target", text: "August invoices.csv" },
      { kind: "scope", text: "24h link" },
    ])
  })

  test("names the files a tool sent, and keeps an unseen one as its id", () => {
    expect(
      materialMetadata({
        materialNames,
        input: { files: [{ fileId: "file-2" }, { fileId: "file-9" }] },
        tool: "gmail_send_message",
      })
    ).toEqual([{ kind: "scope", text: "with Renewal brief.md, file-9" }])
  })
})
