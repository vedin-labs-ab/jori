import { expect, test } from "vitest"
import { getToolPermission } from "../permissions/catalog"
import {
  optionalFieldGuidance,
  schemaHasOptionalFields,
} from "../runs/agent/tools/schemas"
import { runLifecycleTools } from "./lifecycle"
import { visibleNativeToolSnapshots } from "./permissions/native"
import { sandboxTools } from "./sandbox"
import { activeSurfaceTools } from "./surface/tools"

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

test("start_agent requires an explicit task title", () => {
  const startAgent = sandboxTools.find((tool) => tool.name === "start_agent")

  expect(startAgent?.inputSchema).toMatchObject({
    required: ["task", "title"],
    properties: {
      title: {
        description: expect.stringContaining("Concise title"),
        type: "string",
      },
    },
  })
})

test("wait_for_agents requires a bounded relative timeout", () => {
  const waitForAgents = sandboxTools.find(
    (tool) => tool.name === "wait_for_agents"
  )

  expect(waitForAgents?.inputSchema).toMatchObject({
    required: ["runIds", "timeout"],
    properties: {
      timeout: {
        required: ["unit", "value"],
        properties: {
          unit: { enum: ["seconds", "minutes", "hours", "days"] },
          value: { minimum: 1, type: "integer" },
        },
        type: "object",
      },
    },
  })
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
    ...visibleNativeToolSnapshots(runLifecycleTools()),
    ...visibleNativeToolSnapshots(activeSurfaceTools("slack")),
    ...visibleNativeToolSnapshots(sandboxTools),
  ]
  const snapshotTools = snapshots.map((snapshot) => snapshot.tool)

  for (const snapshot of snapshots) {
    expect(snapshot.description).toBe(
      requirePermission(snapshot.tool).description
    )
  }

  expect(snapshotTools).not.toContain("finish_run")
  expect(snapshotTools).not.toContain("send_reply")
  expect(snapshotTools).not.toContain("add_reaction")
  expect(snapshotTools).toEqual(
    expect.arrayContaining(["read", "grep", "glob", "git"])
  )
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
