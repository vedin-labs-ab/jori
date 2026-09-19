import { expect, test } from "vitest"
import {
  getToolPermission,
  resolveToolModes,
} from "../../../contracts/permissions"
import { optionalFieldGuidance } from "../../../contracts/tools"
import { toolDescriptor } from "./tools"

test("uses runtime skill names in the load_skill schema", () => {
  const permission = getToolPermission("load_skill")

  if (permission === undefined) {
    throw new Error("Missing load_skill permission.")
  }

  expect(
    toolDescriptor("jori", permission, resolveToolModes([]), [
      "image-generation",
      "slack",
    ]).inputSchema
  ).toMatchObject({
    properties: {
      name: {
        enum: ["image-generation", "slack"],
      },
    },
  })
})

test("approval-wrapped runtime tool schemas preserve optional field guidance", () => {
  const permission = getToolPermission("read_file")

  if (permission === undefined) {
    throw new Error("Missing read_file permission.")
  }

  const descriptor = toolDescriptor(
    "jori",
    permission,
    resolveToolModes([{ mode: "prompted", tool: "read_file" }])
  )

  expect(descriptor.inputSchema).toMatchObject({
    description: expect.stringContaining(optionalFieldGuidance),
    required: ["fileId", "approval"],
  })
})
