import { expect, test } from "vitest"
import {
  getToolPermission,
  resolveToolModes,
} from "../../../permissions/catalog"
import { createRuntimeToolCapability } from "./bundles"

test("runtime tool capabilities use user-facing descriptions", () => {
  const permission = requirePermission("github_clone_repository")
  const capability = createRuntimeToolCapability(
    "github",
    [permission],
    resolveToolModes([])
  )
  const [tool] = capability.tools

  expect(tool?.description).toBe(permission.description)
  expect(tool?.description).not.toBe(permission.usage)
  expect(tool?.description).not.toContain("/home/user")
})

function requirePermission(tool: string) {
  const permission = getToolPermission(tool)

  if (permission === undefined) {
    throw new Error(`Missing permission for ${tool}`)
  }

  return permission
}
