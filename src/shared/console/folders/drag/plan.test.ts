import { expect, test } from "vitest"
import {
  blockedTargets,
  carriedPayload,
  type DragPayload,
  folderPayload,
  hoverTarget,
  payloadSize,
  planDrop,
  type ResourceDragItem,
  resourcePayload,
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

const ops = { folderId: "ops", name: "Operations" }
const finance = { folderId: "finance", name: "Finance" }
const invoices = { folderId: "invoices", name: "Invoices" }

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

function payload(
  folders: DragPayload["folders"],
  resources: DragPayload["resources"] = []
): DragPayload {
  return { folders, resources }
}

test("plans a folder's move onto another folder", () => {
  expect(planDrop(folders, folderPayload(ops), "finance")).toEqual({
    folderId: "finance",
    folders: [ops],
    resources: [],
  })
})

test("plans a folder's move to top level", () => {
  expect(planDrop(folders, folderPayload(invoices), null)).toEqual({
    folderId: null,
    folders: [invoices],
    resources: [],
  })
})

test("ignores a folder dropped onto itself or into its own subtree", () => {
  expect(planDrop(folders, folderPayload(finance), "finance")).toBeUndefined()
  expect(planDrop(folders, folderPayload(finance), "archive")).toBeUndefined()
})

test("ignores a folder dropped where it already sits", () => {
  expect(planDrop(folders, folderPayload(invoices), "finance")).toBeUndefined()
  expect(planDrop(folders, folderPayload(ops), null)).toBeUndefined()
})

test("ignores a folder missing from the list", () => {
  expect(
    planDrop(folders, folderPayload({ folderId: "gone", name: "?" }), "ops")
  ).toBeUndefined()
})

test("blocks every descendant across the full depth-8 chain", () => {
  const level1 = { folderId: "level1", name: "Level 1" }

  for (const target of deepChain.slice(1)) {
    expect(
      planDrop(deepChain, folderPayload(level1), target.folderId)
    ).toBeUndefined()
  }

  expect(
    planDrop(
      deepChain,
      folderPayload({ folderId: "level8", name: "8" }),
      "level3"
    )?.folders
  ).toHaveLength(1)
})

test("plans re-filing a resource onto another folder or out to the top", () => {
  expect(planDrop(folders, resourcePayload(filedReport), "finance")).toEqual({
    folderId: "finance",
    folders: [],
    resources: [filedReport],
  })
  expect(planDrop(folders, resourcePayload(filedReport), null)?.folderId).toBe(
    null
  )
})

test("ignores a resource dropped on the folder it already sits in", () => {
  expect(
    planDrop(folders, resourcePayload(filedReport), "invoices")
  ).toBeUndefined()
  expect(planDrop(folders, resourcePayload(looseNotes), null)).toBeUndefined()
})

test("a mixed drop moves only what is not already there", () => {
  const plan = planDrop(
    folders,
    payload([invoices, ops], [filedReport, looseNotes]),
    "finance"
  )

  // Invoices already sits in Finance and the report is in Invoices, so
  // Ops re-parents and both resources re-file; then dropping the same
  // pile onto Invoices leaves only what is not there yet.
  expect(plan).toEqual({
    folderId: "finance",
    folders: [ops],
    resources: [filedReport, looseNotes],
  })
  expect(
    planDrop(
      folders,
      payload([invoices], [filedReport, looseNotes]),
      "invoices"
    )
  ).toEqual({ folderId: "invoices", folders: [], resources: [looseNotes] })
})

test("a drag started on a selected row carries the whole selection, front first", () => {
  const selection = payload([ops, invoices], [filedLeads, filedReport])

  expect(carriedPayload(folderPayload(invoices), selection)).toEqual(
    payload([invoices, ops], [filedLeads, filedReport])
  )
  expect(carriedPayload(resourcePayload(filedReport), selection)).toEqual(
    payload([ops, invoices], [filedReport, filedLeads])
  )
  expect(payloadSize(selection)).toBe(4)
})

test("a drag started on an unselected row carries that row alone", () => {
  const selection = payload([ops], [filedLeads])

  expect(carriedPayload(folderPayload(invoices), selection)).toEqual(
    folderPayload(invoices)
  )
  expect(carriedPayload(resourcePayload(looseNotes), selection)).toEqual(
    resourcePayload(looseNotes)
  )
})

test("a dragged folder is blocked from its own subtree and its parent", () => {
  expect(blockedTargets(folders, folderPayload(invoices))).toEqual(
    new Set(["invoices", "archive", "finance"])
  )
  expect(blockedTargets(folders, folderPayload(ops))).toEqual(
    new Set(["ops", null])
  )
})

test("dragged resources are blocked only from the home they share", () => {
  expect(
    blockedTargets(folders, payload([], [filedReport, filedLeads]))
  ).toEqual(new Set(["invoices"]))
  expect(blockedTargets(folders, resourcePayload(looseNotes))).toEqual(
    new Set([null])
  )
  expect(
    blockedTargets(folders, payload([], [filedReport, looseNotes]))
  ).toEqual(new Set())
})

test("a mixed drag is blocked by the union of both rules", () => {
  expect(
    blockedTargets(folders, payload([ops, invoices], [filedReport]))
  ).toEqual(new Set(["ops", null, "invoices", "archive", "finance"]))
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
