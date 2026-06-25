import { expect, test } from "vitest"
import { getToolPermission, resolveToolModes } from "../../permissions/catalog"
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
