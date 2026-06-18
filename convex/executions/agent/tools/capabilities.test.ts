import { expect, test } from "vitest"
import { resolveToolModes } from "../../../permissions/catalog"
import { assembleToolsForRun } from "."
import { integration, runtimeMilo } from "./fixtures"

test("marks prompted runtime capabilities as approval-required", () => {
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [integration("notion")],
    toolModes: resolveToolModes([
      { tool: "notion_query_data_source", mode: "prompted" },
      { tool: "notion_create_page", mode: "prompted" },
    ]),
  })
  const notion = toolBundle.capabilities.find(
    (capability) => capability.surface === "notion"
  )

  expect(
    notion?.tools.find((tool) => tool.tool === "notion_query_data_source")
      ?.requiresApproval
  ).toBe(true)
  expect(
    notion?.tools.find((tool) => tool.tool === "notion_create_page")
      ?.requiresApproval
  ).toBe(true)
  expect(
    notion?.tools.find((tool) => tool.tool === "notion_search")
      ?.requiresApproval
  ).toBeUndefined()
})
