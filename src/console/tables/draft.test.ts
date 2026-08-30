import { expect, test } from "vitest"
import {
  appendColumn,
  columnNameIssue,
  editColumn,
  newColumnDraft,
  removeColumn,
} from "./draft"
import { type TableColumn } from "./types"

const existing: TableColumn[] = [
  { id: "c_title", name: "Title", type: "string", required: true },
  { id: "c_amount", name: "Amount", type: "float" },
]

test("flags empty and duplicate names, ignoring case", () => {
  expect(columnNameIssue(existing, "  ")).toBe("Give the column a name.")
  expect(columnNameIssue(existing, " title ")).toBe(
    'A column named "Title" already exists.'
  )
  expect(columnNameIssue(existing, "Notes")).toBeUndefined()
})

test("a column keeps its own name while being edited", () => {
  expect(columnNameIssue(existing, "Title", "c_title")).toBeUndefined()
  expect(columnNameIssue(existing, "Amount", "c_title")).toBe(
    'A column named "Amount" already exists.'
  )
})

test("appending generates a hidden id and keeps existing columns", () => {
  const appended = appendColumn(existing, {
    name: " Notes ",
    type: "string",
    required: false,
  })

  expect(appended.ok).toBe(true)

  if (appended.ok) {
    expect(appended.columns.slice(0, 2)).toEqual(existing)
    expect(appended.columns[2]).toMatchObject({
      name: "Notes",
      type: "string",
    })
    expect(appended.columns[2]?.id).toMatch(/^c_/)
    expect(appended.columns[2]?.required).toBeUndefined()
  }
})

test("appending a required column keeps the flag", () => {
  const appended = appendColumn([], {
    ...newColumnDraft(),
    name: "Title",
    required: true,
  })

  expect(appended.ok && appended.columns[0]).toMatchObject({
    name: "Title",
    required: true,
  })
})

test("appending rejects a clashing name", () => {
  expect(
    appendColumn(existing, { name: "title", type: "string", required: false })
  ).toEqual({ ok: false, error: 'A column named "Title" already exists.' })
})

test("editing renames and toggles required, keeping id and type", () => {
  const edited = editColumn(existing, "c_amount", {
    name: "Total",
    required: true,
  })

  expect(edited.ok && edited.columns).toEqual([
    existing[0],
    { id: "c_amount", name: "Total", type: "float", required: true },
  ])
})

test("editing rejects renaming onto another column's name", () => {
  expect(
    editColumn(existing, "c_amount", { name: "Title", required: false })
  ).toEqual({ ok: false, error: 'A column named "Title" already exists.' })
})

test("removing filters the column out by id", () => {
  expect(removeColumn(existing, "c_title")).toEqual([existing[1]])
})
