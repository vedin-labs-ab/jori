import { expect, test } from "vitest"
import {
  appendColumn,
  columnDraftsIssue,
  draftsFromColumns,
  draftsToColumns,
  newColumnDraft,
  renameColumn,
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

test("appending a column keeps existing ones and adds an optional column", () => {
  const existing: TableColumn[] = [
    { key: "title", name: "Title", type: "string", required: true },
  ]
  const appended = appendColumn(existing, {
    key: "amount",
    name: "Amount",
    type: "float",
  })

  expect(appended).toEqual({
    ok: true,
    columns: [
      { key: "title", name: "Title", type: "string", required: true },
      { key: "amount", name: "Amount", type: "float" },
    ],
  })
})

test("appending a column falls back to the key as its display name", () => {
  const appended = appendColumn(
    [{ key: "title", name: "Title", type: "string" }],
    { key: "notes", name: "  ", type: "string" }
  )

  expect(appended.ok && appended.columns[1]).toEqual({
    key: "notes",
    name: "notes",
    type: "string",
  })
})

test("appending a column rejects duplicate and malformed keys", () => {
  const existing: TableColumn[] = [
    { key: "title", name: "Title", type: "string" },
  ]

  expect(
    appendColumn(existing, { key: "title", name: "", type: "string" })
  ).toEqual({ ok: false, error: 'Duplicate column key "title".' })
  expect(appendColumn(existing, { key: "", name: "", type: "string" })).toEqual(
    { ok: false, error: "Every column needs a key." }
  )
})

test("renaming a column touches only its display name", () => {
  const existing: TableColumn[] = [
    { key: "title", name: "Title", type: "string", required: true },
    { key: "amount", name: "Amount", type: "float" },
  ]

  expect(renameColumn(existing, "amount", "Total")).toEqual([
    existing[0],
    { key: "amount", name: "Total", type: "float" },
  ])
  expect(renameColumn(existing, "amount", "  ")[1]?.name).toBe("amount")
})

function draft(overrides: Partial<ReturnType<typeof newColumnDraft>>) {
  return { ...newColumnDraft(), ...overrides }
}
