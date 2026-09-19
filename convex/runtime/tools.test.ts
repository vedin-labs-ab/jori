import { expect, test } from "vitest"
import { getToolPermission } from "../../contracts/permissions"
import {
  optionalFieldGuidance,
  schemaHasOptionalFields,
} from "../../contracts/tools"
import { type Doc } from "../_generated/dataModel"
import { type AgentRuntimeInput } from "../runs/agent/input"
import { runtimeTools } from "./context/response"
import { runLifecycleTools, sandboxTools } from "./native"
import { visibleNativeToolSnapshots } from "./permissions/native"
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
  expect(startAgent?.description).toContain("clearly marked data block")
})

test("wait_for_agents bounds its optional timeout", () => {
  const waitForAgents = sandboxTools.find(
    (tool) => tool.name === "wait_for_agents"
  )

  expect(waitForAgents?.inputSchema).toMatchObject({
    required: ["runIds"],
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

test("a run gets only the sandbox and agent tools its contract grants", () => {
  const sandboxNames = new Set<string>(sandboxTools.map((tool) => tool.name))
  const held = (jori: string[]) =>
    runtimeTools(
      jobInput(jori),
      [],
      { state: null, tools: [] },
      { all: [], capabilities: [], toolModes: new Map(), tools: [] }
    )
      .map((tool) => tool.name)
      .filter((name) => sandboxNames.has(name))

  expect(held([])).toEqual([])
  expect(held(["bash"])).toEqual(["bash"])
  expect(held(["bash", "start_agent"])).toEqual(["bash", "start_agent"])
})

test("native snapshots validate visible tool routes after hiding internal tools", () => {
  expect(
    visibleNativeToolSnapshots([
      { access: "write", name: "finish_run", route: "sandbox" },
    ])
  ).toEqual([])

  expect(() =>
    visibleNativeToolSnapshots([
      { access: "read", name: "read", route: "surface" },
    ])
  ).toThrow("Missing surface tool permission: read")

  expect(() =>
    visibleNativeToolSnapshots([
      { access: "read", name: "unknown_tool", route: "sandbox" },
    ])
  ).toThrow("Missing sandbox tool permission: unknown_tool")
})

function jobInput(jori: string[]): AgentRuntimeInput {
  return {
    type: "job",
    access: { integrations: [], jori },
    instructions: "Test",
    run: {} as Doc<"runs">,
    event: null,
    integration: null,
    integrations: [],
    organization: null,
    requester: null,
    timezone: null,
  }
}

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
