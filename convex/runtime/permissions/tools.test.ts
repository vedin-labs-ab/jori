import { expect, test } from "vitest"
import {
  getToolPermission,
  resolveToolModes,
} from "../../../contracts/permissions"
import { integration } from "../../../test/convex/tools"
import { type Doc } from "../../_generated/dataModel"
import { type InstructionRuntimeInput } from "../../runs/agent/input"
import { optionalFieldGuidance } from "../../runs/agent/tools/schemas"
import { permissionGroups, toolDescriptor } from "./tools"

test("uses runtime skill names in the load_skill schema", () => {
  const permission = getToolPermission("load_skill")

  if (permission === undefined) {
    throw new Error("Missing load_skill permission.")
  }

  expect(
    toolDescriptor("milo", permission, resolveToolModes([]), [
      "artifact-creator",
      "frontend-design",
    ]).inputSchema
  ).toMatchObject({
    properties: {
      name: {
        enum: ["artifact-creator", "frontend-design"],
      },
    },
  })
})

test("instruction runs without access get the full tool surface", () => {
  const groups = permissionGroups(instructionInput({}), resolveToolModes([]))

  expect(surfaceTools(groups, "gmail")).toEqual(
    expect.arrayContaining([
      "google_gmail_search_threads",
      "google_gmail_send_message",
    ])
  )
  expect(surfaceTools(groups, "milo")).toContain("web_search")
})

test("instruction runs with access are narrowed to their tool contract", () => {
  const gmail = integration("gmail")
  const groups = permissionGroups(
    instructionInput({
      integrations: [gmail],
      access: {
        integrations: [
          { id: gmail._id, tools: ["google_gmail_search_threads"] },
        ],
        web: false,
      },
    }),
    resolveToolModes([])
  )

  expect(surfaceTools(groups, "gmail")).toEqual(["google_gmail_search_threads"])
  expect(surfaceTools(groups, "milo")).not.toContain("web_search")
  expect(surfaceTools(groups, "milo")).not.toContain("web_fetch")
})

function instructionInput(overrides: Partial<InstructionRuntimeInput>) {
  return {
    type: "instruction" as const,
    run: {} as Doc<"runs">,
    instructions: "Do the thing.",
    integrations: [integration("gmail")],
    organization: null,
    requester: null,
    timezone: null,
    workstreams: null,
    ...overrides,
  }
}

function surfaceTools(
  groups: ReturnType<typeof permissionGroups>,
  surface: string
) {
  return (
    groups
      .find((group) => group.surface === surface)
      ?.permissions.map((permission) => permission.tool) ?? []
  )
}

test("approval-wrapped runtime tool schemas preserve optional field guidance", () => {
  const permission = getToolPermission("read_asset")

  if (permission === undefined) {
    throw new Error("Missing read_asset permission.")
  }

  const descriptor = toolDescriptor(
    "milo",
    permission,
    resolveToolModes([{ mode: "prompted", tool: "read_asset" }])
  )

  expect(descriptor.inputSchema).toMatchObject({
    description: expect.stringContaining(optionalFieldGuidance),
    required: ["assetId", "approval"],
  })
})
