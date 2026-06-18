import { expect, test } from "vitest"
import { canDeleteBlob } from "./gc"

test("allows blob deletion when all parent trees are deleted", () => {
  expect(
    canDeleteBlob(
      [{ treeId: "root" }, { treeId: "child" }],
      new Set(["root", "child"])
    )
  ).toBe(true)
})

test("keeps blobs referenced by retained trees", () => {
  expect(
    canDeleteBlob(
      [{ treeId: "deleted" }, { treeId: "retained" }],
      new Set(["deleted"])
    )
  ).toBe(false)
})

test("keeps blobs without known parent entries", () => {
  expect(canDeleteBlob([], new Set(["root"]))).toBe(false)
})
