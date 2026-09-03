import { expect, test } from "vitest"
import {
  blockedTargets,
  hoverTarget,
  planDrop,
  planFileDrop,
  type ResourceDragItem,
  resourcesPayload,
} from "./plan"

const folders = [
  { folderId: "ops", name: "Operations" },
  { folderId: "finance", name: "Finance" },
  { folderId: "invoices", name: "Invoices", parentId: "finance" },
  { folderId: "archive", name: "Archive", parentId: "invoices" },
]

// The backend caps nesting at depth 8; the deepest chain the tree can
// legally show is the drag logic's worst case.
const deepChain = Array.from({ length: 8 }, (_, index) => ({
  folderId: `level${index + 1}`,
  name: `Level ${index + 1}`,
  parentId: index === 0 ? undefined : `level${index}`,
}))

test("plans a move onto another folder", () => {
  expect(planDrop(folders, "ops", "finance")).toEqual({ parentId: "finance" })
})

test("plans a move to top level", () => {
  expect(planDrop(folders, "invoices", null)).toEqual({ parentId: null })
})

test("ignores a drop onto the folder itself", () => {
  expect(planDrop(folders, "finance", "finance")).toBeUndefined()
})

test("ignores a drop into the folder's own subtree", () => {
  expect(planDrop(folders, "finance", "archive")).toBeUndefined()
})

test("ignores a drop onto the current parent", () => {
  expect(planDrop(folders, "invoices", "finance")).toBeUndefined()
})

test("ignores a top-level drop for a folder already at top level", () => {
  expect(planDrop(folders, "ops", null)).toBeUndefined()
})

test("ignores a folder missing from the list", () => {
  expect(planDrop(folders, "gone", "finance")).toBeUndefined()
})

test("blocks every descendant across the full depth-8 chain", () => {
  for (const target of deepChain.slice(1)) {
    expect(planDrop(deepChain, "level1", target.folderId)).toBeUndefined()
  }

  expect(planDrop(deepChain, "level8", "level3")).toEqual({
    parentId: "level3",
  })
})

const filedReport: ResourceDragItem = {
  type: "file",
  id: "report",
  name: "report.pdf",
  folderId: "invoices",
}

const filedLeads: ResourceDragItem = {
  type: "table",
  id: "leads",
  name: "Leads",
  folderId: "invoices",
}

const looseNotes: ResourceDragItem = {
  type: "store",
  id: "notes",
  name: "Notes",
}

function dragged(...items: ResourceDragItem[]) {
  return { kind: "resources" as const, items }
}

test("plans re-filing a resource onto another folder", () => {
  expect(planFileDrop(dragged(filedReport), "finance")).toEqual({
    folderId: "finance",
    items: [filedReport],
  })
})

test("plans unfiling a resource dropped on the root header", () => {
  expect(planFileDrop(dragged(filedReport), null)).toEqual({
    folderId: null,
    items: [filedReport],
  })
})

test("ignores a resource dropped on the folder it already sits in", () => {
  expect(planFileDrop(dragged(filedReport), "invoices")).toBeUndefined()
})

test("plans filing an unfiled resource, and ignores unfiling it", () => {
  expect(planFileDrop(dragged(looseNotes), "ops")).toEqual({
    folderId: "ops",
    items: [looseNotes],
  })
  expect(planFileDrop(dragged(looseNotes), null)).toBeUndefined()
})

test("a selection drop moves only the items not already there", () => {
  expect(planFileDrop(dragged(filedReport, looseNotes), "invoices")).toEqual({
    folderId: "invoices",
    items: [looseNotes],
  })
  expect(planFileDrop(dragged(filedReport, filedLeads), "ops")?.items).toEqual([
    filedReport,
    filedLeads,
  ])
})

test("a drag started on a selected row carries the whole selection", () => {
  expect(resourcesPayload(filedReport, [filedLeads, filedReport])).toEqual(
    dragged(filedLeads, filedReport)
  )
})

test("a drag started on an unselected row carries that row alone", () => {
  expect(resourcesPayload(looseNotes, [filedLeads, filedReport])).toEqual(
    dragged(looseNotes)
  )
  expect(resourcesPayload(looseNotes, [])).toEqual(dragged(looseNotes))
})

test("a dragged folder is blocked from its own subtree and its parent", () => {
  expect(
    blockedTargets(folders, {
      kind: "folder",
      folderId: "invoices",
      name: "Invoices",
    })
  ).toEqual(new Set(["invoices", "archive", "finance"]))
})

test("a dragged top-level folder is blocked from the top level", () => {
  expect(
    blockedTargets(folders, { kind: "folder", folderId: "ops", name: "Ops" })
  ).toEqual(new Set(["ops", null]))
})

test("dragged resources are blocked only from the home they share", () => {
  expect(blockedTargets(folders, dragged(filedReport, filedLeads))).toEqual(
    new Set(["invoices"])
  )
  expect(blockedTargets(folders, dragged(looseNotes))).toEqual(new Set([null]))
  expect(blockedTargets(folders, dragged(filedReport, looseNotes))).toEqual(
    new Set()
  )
})

test("dwells on a droppable sidebar folder row", () => {
  expect(hoverTarget(new Set(), { folderId: "finance", expands: true })).toBe(
    "finance"
  )
})

test("does not dwell on the root header", () => {
  expect(hoverTarget(new Set(), { folderId: null, expands: false })).toBeNull()
})

test("does not dwell between rows", () => {
  expect(hoverTarget(new Set(), undefined)).toBeNull()
})

test("does not dwell on folder-page rows, which cannot unfold", () => {
  expect(
    hoverTarget(new Set(), { folderId: "finance", expands: false })
  ).toBeNull()
})

test("does not dwell on a blocked row", () => {
  expect(
    hoverTarget(new Set(["finance"]), { folderId: "finance", expands: true })
  ).toBeNull()
})
