import { expect, test } from "vitest"
import {
  optionalFieldGuidance,
  schemaHasOptionalFields,
} from "../runs/agent/tools/schemas"
import { runLifecycleTools } from "./lifecycle/tools"
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

function schemaDescription(schema: Record<string, unknown>) {
  return typeof schema.description === "string" ? schema.description : ""
}
