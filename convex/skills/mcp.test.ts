import { expect, test } from "vitest"
import { decodeJson, encodeToolResult } from "../../contracts/json"
import { runtimeSkill, runtimeSkills } from "../../test/convex/skills"
import { loadJoriSkillTool } from "./mcp"

test("loads an available runtime skill", () => {
  expect(
    loadJoriSkillTool(runtimeSkills(), {
      tool: "load_skill",
      args: { name: "slack" },
    })
  ).toMatchObject({
    status: "loaded",
    skill: {
      name: "slack",
      surfaces: ["slack"],
      instructions: expect.stringContaining(
        "Format Slack messages with Slack `mrkdwn`"
      ),
    },
  })
})

test("loads complete instructions with all communication parts", () => {
  expect(
    loadJoriSkillTool(runtimeSkills(), {
      tool: "load_skill",
      args: { name: "slack" },
    })
  ).toMatchObject({
    status: "loaded",
    skill: {
      instructions: expect.stringContaining(
        "Use Slack `blocks` when structure makes the message easier to scan"
      ),
    },
  })
})

test("loads non-integration skills with JSON-safe metadata", () => {
  const result = loadJoriSkillTool(runtimeSkills(), {
    tool: "load_skill",
    args: { name: "image-generation" },
  })

  expect(decodeJson(encodeToolResult(result))).toMatchObject({
    status: "loaded",
    skill: {
      name: "image-generation",
      surfaces: [],
      instructions: expect.stringContaining("Call `generate_image`"),
    },
  })
})

test("returns available skills when a skill is unknown", () => {
  expect(
    loadJoriSkillTool(runtimeSkills(), {
      tool: "load_skill",
      args: { name: "github" },
    })
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

test("organization skills override global skills with the same name", () => {
  expect(
    loadJoriSkillTool(
      runtimeSkills([
        runtimeSkill({
          organizationId: "organization",
          name: "image-generation",
          description: "Organization image rules.",
          body: "# Organization Images\n\nUse the organization image style.",
        }),
      ]),
      {
        tool: "load_skill",
        args: { name: "image-generation" },
      }
    )
  ).toMatchObject({
    status: "loaded",
    skill: {
      name: "image-generation",
      description: "Organization image rules.",
      instructions: expect.stringContaining("organization image style"),
    },
  })
})
