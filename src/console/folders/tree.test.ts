import { expect, test } from "vitest"
import {
  activeFolderId,
  ancestorFolderIds,
  buildFolderTree,
  subtreeFolderIds,
} from "./tree"

const rows = [
  { folderId: "ops", name: "Operations" },
  { folderId: "finance", name: "Finance" },
  { folderId: "invoices", name: "Invoices", parentId: "finance" },
  { folderId: "archive", name: "Archive", parentId: "invoices" },
  { folderId: "budgets", name: "Budgets", parentId: "finance" },
]

test("nests the flat list and name-sorts every level", () => {
  const tree = buildFolderTree(rows)

  expect(tree.map((node) => node.name)).toEqual(["Finance", "Operations"])

  const finance = tree[0]

  expect(finance?.children.map((node) => node.name)).toEqual([
    "Budgets",
    "Invoices",
  ])
  expect(finance?.children[1]?.children.map((node) => node.name)).toEqual([
    "Archive",
  ])
})

test("treats a folder with a missing parent as a root", () => {
  const tree = buildFolderTree([
    { folderId: "stray", name: "Stray", parentId: "gone" },
    { folderId: "kept", name: "Kept" },
  ])

  expect(tree.map((node) => node.folderId)).toEqual(["kept", "stray"])
})

test("carries the row's extra fields onto the node", () => {
  const tree = buildFolderTree([
    { folderId: "only", name: "Only", updatedAt: 7 },
  ])

  expect(tree[0]?.updatedAt).toBe(7)
})

test("collects the folder itself and every descendant", () => {
  const subtree = subtreeFolderIds(rows, "finance")

  expect([...subtree].sort()).toEqual([
    "archive",
    "budgets",
    "finance",
    "invoices",
  ])
})

test("a leaf's subtree is just itself", () => {
  expect([...subtreeFolderIds(rows, "budgets")]).toEqual(["budgets"])
})

test("walks ancestors nearest first and survives cycles", () => {
  expect(ancestorFolderIds(rows, "archive")).toEqual(["invoices", "finance"])
  expect(
    ancestorFolderIds(
      [
        { folderId: "a", name: "A", parentId: "b" },
        { folderId: "b", name: "B", parentId: "a" },
      ],
      "a"
    )
  ).toEqual(["b"])
})

test("a folder stays the active one on its usage page", () => {
  expect(activeFolderId("/folders/finance")).toBe("finance")
  expect(activeFolderId("/folders/finance/usage")).toBe("finance")
})

test("the surface's own pages belong to no folder", () => {
  expect(activeFolderId("/folders")).toBeUndefined()
  expect(activeFolderId("/folders/usage")).toBeUndefined()
  expect(activeFolderId("/runs")).toBeUndefined()
})
