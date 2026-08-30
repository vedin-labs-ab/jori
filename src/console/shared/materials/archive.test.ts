import { expect, test } from "vitest"
import { shouldIncludeArchived, statusFacet } from "./archive"

test("the status facet defaults to active rows only", () => {
  expect(statusFacet.defaults).toEqual(["active"])
  expect(statusFacet.resolve({ archivedAt: undefined })).toBe("active")
  expect(statusFacet.resolve({ archivedAt: 1 })).toBe("archived")
})

test("only selections that can show archived rows fetch them", () => {
  expect(shouldIncludeArchived(["active"])).toBe(false)
  expect(shouldIncludeArchived(["archived"])).toBe(true)
  expect(shouldIncludeArchived(["active", "archived"])).toBe(true)
  expect(shouldIncludeArchived(undefined)).toBe(true)
})
