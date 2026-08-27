import { expect, test } from "vitest"
import {
  columnDraftsIssue,
  draftsFromColumns,
  draftsToColumns,
  newColumnDraft,
  validateTableForm,
} from "./draft"
import { type TableColumn } from "./types"

test("requires at least one column", () => {
  expect(columnDraftsIssue([])).toBe("Add at least one column.")
})

test("flags empty, malformed, and duplicate keys", () => {
  expect(columnDraftsIssue([draft({ key: "" })])).toBe(
    "Every column needs a key."
  )
  expect(columnDraftsIssue([draft({ key: "9lives" })])).toContain(
    "must start with a letter"
  )
  expect(
    columnDraftsIssue([draft({ key: "twice" }), draft({ key: "twice" })])
  ).toBe('Duplicate column key "twice".')
  expect(columnDraftsIssue([draft({ key: "fine" })])).toBeUndefined()
})

test("new drafts become columns with required only when set", () => {
  const columns = draftsToColumns(
    [
      draft({ key: "title", name: "Title", required: true }),
      draft({ key: "notes" }),
    ],
    []
  )

  expect(columns).toEqual([
    { key: "title", name: "Title", type: "string", required: true },
    { key: "notes", name: "notes", type: "string" },
  ])
})

test("locked drafts keep everything but the display name", () => {
  const existing: TableColumn[] = [
    {
      key: "amount",
      name: "Amount",
      type: "float",
      required: true,
    },
  ]
  const drafts = draftsFromColumns(existing)
  const renamed = drafts.map((entry) => ({ ...entry, name: "Total" }))

  expect(drafts[0]?.locked).toBe(true)
  expect(draftsToColumns(renamed, existing)).toEqual([
    { ...existing[0], name: "Total" },
  ])
})

test("form validation flags a missing name and column problems together", () => {
  expect(validateTableForm("  ", [draft({ key: "" })])).toEqual({
    name: "Give the table a name.",
    columns: "Every column needs a key.",
  })
  expect(validateTableForm("Launches", [draft({ key: "title" })])).toEqual({
    name: undefined,
    columns: undefined,
  })
})

function draft(overrides: Partial<ReturnType<typeof newColumnDraft>>) {
  return { ...newColumnDraft(), ...overrides }
}
