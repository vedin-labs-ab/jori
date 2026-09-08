import { expect, test } from "vitest"
import { toolPermissions } from "../../../contracts/permissions"
import { compileSchema } from "../../../test/convex/schema"
import { getToolInputSchema } from "../../runs/agent/tools/schemas"
import { getToolResponseSchema } from "../../runs/agent/tools/schemas/responses"
import { runLifecycleTools, sandboxTools } from "../../runtime/native"
import { activeSurfaceTools } from "../../runtime/surface/tools"
import { normalizeBrokerToolInput } from "."

const nativeTools = [
  ...runLifecycleTools(),
  ...sandboxTools,
  ...activeSurfaceTools("console"),
  ...activeSurfaceTools("slack"),
  ...activeSurfaceTools("github"),
  ...activeSurfaceTools("linear"),
]

test("every catalogued tool has an input and output contract", () => {
  for (const permission of toolPermissions) {
    const input =
      permission.route === "broker"
        ? getToolInputSchema(permission.tool)
        : nativeTools.find((tool) => tool.name === permission.tool)?.inputSchema
    expect(input, `${permission.tool} input`).toBeDefined()
    expect(() => compileSchema(input), `${permission.tool} input`).not.toThrow()
    expect(
      getToolResponseSchema(permission.tool),
      `${permission.tool} output`
    ).toBeDefined()
    expect(
      () => compileSchema(getToolResponseSchema(permission.tool)),
      `${permission.tool} output`
    ).not.toThrow()
  }
  expect(new Set(toolPermissions.map(({ tool }) => tool)).size).toBe(
    toolPermissions.length
  )
})

test.each(
  toolPermissions.filter(({ route }) => route === "broker")
)("$tool rejects non-object inputs and undeclared root fields", ({ tool }) => {
  for (const input of [null, [], "text", 1, true, { unexpected_field: true }]) {
    expect(() => normalizeBrokerToolInput(tool, input), tool).toThrow()
  }
})
