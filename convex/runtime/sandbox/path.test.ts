import { expect, test } from "vitest"
import { sandboxWorkspace } from "../../../contracts/coding"
import { sandboxClonePath, sandboxWorkspacePath } from "./path"

test("uses the repository name as the default clone destination", () => {
  const input = { repository: "acme/app", value: undefined }

  expect(sandboxClonePath(input)).toBe(`${sandboxWorkspace}/app`)
  expect(sandboxClonePath({ ...input, value: null })).toBe(
    `${sandboxWorkspace}/app`
  )
  expect(sandboxClonePath({ ...input, value: " " })).toBe(
    `${sandboxWorkspace}/app`
  )
})

test("keeps explicit clone destinations inside the workspace", () => {
  expect(sandboxClonePath({ repository: "acme/app", value: "service" })).toBe(
    `${sandboxWorkspace}/service`
  )
  expect(() =>
    sandboxClonePath({ repository: "acme/app", value: "/tmp/repository" })
  ).toThrow("Sandbox path must be inside the Jori workspace")
})

test("allows the workspace root as a command cwd", () => {
  expect(sandboxWorkspacePath(undefined)).toBe(sandboxWorkspace)
  expect(sandboxWorkspacePath(sandboxWorkspace)).toBe(sandboxWorkspace)
  expect(() => sandboxWorkspacePath("/tmp")).toThrow(
    "Sandbox path must be inside the Jori workspace"
  )
})
