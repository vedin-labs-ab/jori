import { expect, test } from "vitest"
import { getToolPermission } from "../permissions/catalog"
import {
  optionalFieldGuidance,
  schemaHasOptionalFields,
} from "../runs/agent/tools/schemas"
import { runLifecycleToolSnapshot } from "./lifecycle/snapshot"
import { runLifecycleTools } from "./lifecycle/tools"
import { sandboxToolSnapshot, sandboxTools } from "./sandbox"
import { activeSurfaceToolSnapshot, activeSurfaceTools } from "./surface/tools"

test("runtime tool schemas with optional fields share omission guidance", () => {
  const tools = [
    ...runLifecycleTools(),
    ...activeSurfaceTools("slack"),
    ...activeSurfaceTools("linear"),
    ...activeSurfaceTools("github"),
    ...sandboxTools,
  ]
  const missingGuidance = tools
    .filter((tool) => schemaHasOptionalFields(tool.inputSchema))
    .filter(
      (tool) =>
        !schemaDescription(tool.inputSchema).includes(optionalFieldGuidance)
    )
    .map((tool) => tool.name)

  expect(missingGuidance).toEqual([])
})

test("native runtime tools use catalog usage for agents and descriptions for users", () => {
  const runtimeTools = [
    ...runLifecycleTools(),
    ...activeSurfaceTools("slack"),
    ...sandboxTools,
  ]

  for (const tool of runtimeTools) {
    const permission = requirePermission(tool.name)

    expect(permission.route).toBe(tool.route)
    expect(permission.usage).toBe(tool.description)
    expect(permission.description).not.toBe(tool.description)
    expect(permission.description).not.toContain("/home/user")
  }

  const snapshots = [
    ...runLifecycleToolSnapshot(runLifecycleTools()),
    ...activeSurfaceToolSnapshot(activeSurfaceTools("slack")),
    ...sandboxToolSnapshot(),
  ]

  for (const snapshot of snapshots) {
    expect(snapshot.description).toBe(
      requirePermission(snapshot.tool).description
    )
  }
})

function schemaDescription(schema: Record<string, unknown>) {
  return typeof schema.description === "string" ? schema.description : ""
}

function requirePermission(tool: string) {
  const permission = getToolPermission(tool)

  if (permission === undefined) {
    throw new Error(`Missing permission for ${tool}`)
  }

  return permission
}
