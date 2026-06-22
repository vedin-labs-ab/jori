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
      instructions: expect.stringContaining(
        "Format Slack messages with Slack `mrkdwn`"
      ),
    },
  })
})

test("loads complete instructions with all communication parts", () => {
  expect(
    callMiloSkillTool({ tool: "load_skill", args: { name: "slack" } })
  ).toMatchObject({
    status: "loaded",
    skill: {
      instructions: expect.stringContaining(
        "Use Slack `blocks` when native structure"
      ),
    },
  })
})

test("returns available skills when a skill is unknown", () => {
  expect(
    callMiloSkillTool({ tool: "load_skill", args: { name: "github" } })
  ).toMatchObject({
    status: "not_found",
    name: "github",
    availableSkills: expect.arrayContaining([
      expect.objectContaining({
        name: "image-generation",
      }),
      expect.objectContaining({
        name: "slack",
      }),
    ]),
  })
})
