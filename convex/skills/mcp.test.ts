import { expect, test } from "vitest"
import { callMiloSkillTool } from "./mcp"

test("loads an available runtime skill", () => {
  expect(
    callMiloSkillTool({ tool: "load_skill", args: { name: "slack" } })
  ).toMatchObject({
    status: "loaded",
    skill: {
      name: "slack",
      associatedIntegrations: ["slack"],
      instructions: expect.stringContaining("Write Slack `mrkdwn` only"),
    },
  })
})

test("returns available skills when a skill is unknown", () => {
  expect(
    callMiloSkillTool({ tool: "load_skill", args: { name: "github" } })
  ).toMatchObject({
    status: "not_found",
    name: "github",
    availableSkills: [
      expect.objectContaining({
        name: "slack",
      }),
    ],
  })
})
