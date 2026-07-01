import { expect, test } from "vitest"
import { getToolPermission, resolveToolModes } from "../../permissions/catalog"
import { optionalFieldGuidance } from "../../runs/agent/tools/schemas"
import { toolDescriptor } from "./tools"

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
