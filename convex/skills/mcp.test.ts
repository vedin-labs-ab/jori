import { expect, test } from "vitest"
import { decodeToolResult, encodeToolResult } from "../../contracts/transport"
import {
  runtimeSkill,
  runtimeSkills,
} from "../runs/agent/prompt/skill_fixtures"
import { loadMiloSkillTool } from "./mcp"

test("loads an available runtime skill", () => {
  expect(
    loadMiloSkillTool(runtimeSkills(), {
      tool: "load_skill",
      args: { name: "slack" },
    })
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
    loadMiloSkillTool(runtimeSkills(), {
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
  const result = loadMiloSkillTool(runtimeSkills(), {
    tool: "load_skill",
    args: { name: "image-generation" },
  })

  expect(decodeToolResult(encodeToolResult(result))).toMatchObject({
    status: "loaded",
    skill: {
      name: "image-generation",
      associatedIntegrations: [],
      instructions: expect.stringContaining("Call `generate_image`"),
    },
  })
})

test("returns available skills when a skill is unknown", () => {
  expect(
    loadMiloSkillTool(runtimeSkills(), {
      tool: "load_skill",
      args: { name: "github" },
    })
  ).toMatchObject({
    status: "not_found",
    name: "github",
    availableSkills: expect.arrayContaining([
      expect.objectContaining({
        name: "artifact-creator",
      }),
      expect.objectContaining({
        name: "frontend-design",
      }),
      expect.objectContaining({
        name: "image-generation",
      }),
      expect.objectContaining({
        name: "slack",
      }),
    ]),
  })
})

test("tenant skills override global skills with the same name", () => {
  expect(
    loadMiloSkillTool(
      runtimeSkills([
        runtimeSkill({
          tenantId: "tenant",
          name: "image-generation",
          description: "Tenant image rules.",
          body: "# Tenant Images\n\nUse the tenant image style.",
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
      description: "Tenant image rules.",
      instructions: expect.stringContaining("tenant image style"),
    },
  })
})
