import { expect, test } from "vitest"
import { hoverTarget, planDrop, rootDropId } from "./plan"

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

test("dwells on a droppable folder row", () => {
  expect(hoverTarget(new Set(), "finance")).toBe("finance")
})

test("does not dwell on the root header", () => {
  expect(hoverTarget(new Set(), rootDropId)).toBeNull()
})

test("does not dwell between rows", () => {
  expect(hoverTarget(new Set(), undefined)).toBeNull()
})

test("does not dwell on the dragged subtree", () => {
  expect(hoverTarget(new Set(["finance"]), "finance")).toBeNull()
})
