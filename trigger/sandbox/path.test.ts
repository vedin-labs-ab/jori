import { expect, test } from "vitest"
import { sandboxWorkspace } from "./artifacts"
import { sandboxClonePath } from "./path"

test("uses the workspace root as the default clone destination", () => {
  expect(sandboxClonePath(undefined)).toBe(sandboxWorkspace)
  expect(sandboxClonePath(null)).toBe(sandboxWorkspace)
  expect(sandboxClonePath(" ")).toBe(sandboxWorkspace)
})

test("keeps explicit clone destinations inside the workspace", () => {
  expect(sandboxClonePath("repository")).toBe(`${sandboxWorkspace}/repository`)
  expect(() => sandboxClonePath("/tmp/repository")).toThrow(
    "Sandbox path must be inside the Milo workspace"
  )
})
