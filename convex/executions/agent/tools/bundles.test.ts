import { describe, expect, test } from "vitest"
import { type Doc } from "../../../_generated/dataModel"
import {
  getToolPermissionsBySurface,
  resolveToolModes,
} from "../../../permissions/catalog"
import { assemblePrompt } from "../prompt"
import { type RuntimeSkill } from "../sandbox/skills"
import { assembleToolsForRun } from "."
import { filterRuntimeSkillsForBundle } from "./bundles"

describe("runtime integration bundles", () => {
  test("omits Slack formatting skill when Slack tools are unavailable", () => {
    const toolModes = resolveToolModes(
      getToolPermissionsBySurface("gmail").map((permission) => ({
        tool: permission.tool,
        mode: "blocked" as const,
      }))
    )
    const toolBundle = assembleToolsForRun({
      milo: {
        convexSiteUrl: "https://convex.example",
        executionToken: "execution-token",
      },
      integrations: [integration("gmail")],
      toolModes,
    })
    const promptSkills = filterRuntimeSkillsForBundle(
      [
        runtimeSkill("slack", null, "Use Slack mrkdwn formatting."),
        runtimeSkill("email-style", "tenant", "Keep email concise."),
      ],
      toolBundle.skillNames
    )
    const prompt = assemblePrompt(runtimeInput())

    expect(toolBundle.mcpServers.map((server) => server.name)).not.toContain(
      "gmail"
    )
    expect(toolBundle.skillNames).not.toContain("slack")
    expect(
      toolBundle.capabilities.map((capability) => capability.label)
    ).not.toContain("Gmail")
    expect(promptSkills.map((skill) => skill.name)).toEqual(["email-style"])
    expect(prompt).not.toContain("Use Slack mrkdwn formatting.")
    expect(prompt).not.toContain("Keep email concise.")
    expect(prompt).not.toContain("# Skills")
  })
})

describe("runtime active integration availability", () => {
  test("omits inactive integrations from tools, skills, and availability", () => {
    const toolBundle = assembleToolsForRun({
      milo: {
        convexSiteUrl: "https://convex.example",
        executionToken: "execution-token",
      },
      integrations: [integration("slack"), integration("notion", "paused")],
      toolModes: resolveToolModes([]),
    })
    const promptSkills = filterRuntimeSkillsForBundle(
      [
        runtimeSkill("slack", null, "Use conversations_history."),
        runtimeSkill("team-style", "tenant", "Prefer concise status updates."),
      ],
      toolBundle.skillNames
    )
    const prompt = assemblePrompt(runtimeInput(), toolBundle.promptedTools)

    expect(toolBundle.mcpServers.map((server) => server.name)).toContain(
      "slack"
    )
    expect(toolBundle.mcpServers.map((server) => server.name)).not.toContain(
      "notion"
    )
    expect(toolBundle.skillNames).toContain("slack")
    expect(toolBundle.skillNames).not.toContain("notion")
    expect(promptSkills.map((skill) => skill.name)).toEqual([
      "slack",
      "team-style",
    ])
    expect(
      toolBundle.capabilities.map((capability) => capability.label)
    ).toEqual(["Milo", "Slack"])
    expect(prompt).not.toContain("Slack: List channels")
    expect(prompt).not.toContain("Notion:")
    expect(prompt).not.toContain("notion_search")
  })
})

describe("runtime native tool availability metadata", () => {
  test("keeps active connected capabilities out of the prompt", () => {
    const toolBundle = assembleToolsForRun({
      milo: {
        convexSiteUrl: "https://convex.example",
        executionToken: "execution-token",
      },
      integrations: [integration("slack")],
      toolModes: resolveToolModes([]),
    })
    const prompt = assemblePrompt(runtimeInput(), toolBundle.promptedTools)

    expect(
      toolBundle.capabilities.map((capability) => capability.label)
    ).toEqual(["Milo", "Slack"])
    expect(prompt).not.toContain("# Available Tools")
    expect(prompt).not.toContain("Automations: Search automations")
    expect(prompt).not.toContain("Slack: List channels")
    expect(prompt).not.toContain("Notion:")
    expect(prompt).not.toContain("Local workspace")
    expect(prompt).not.toContain("Web/current")
  })
})

describe("runtime shared provider bundles", () => {
  test("does not attach built-in skills to non-Slack providers", () => {
    const toolBundle = assembleToolsForRun({
      milo: {
        convexSiteUrl: "https://convex.example",
        executionToken: "execution-token",
      },
      integrations: [
        integration("microsoftEmail"),
        integration("microsoftCalendar"),
      ],
      toolModes: resolveToolModes([]),
    })

    expect(toolBundle.skillNames).toEqual([])
    expect(
      toolBundle.capabilities.map((capability) => capability.label)
    ).toEqual(["Milo", "Outlook Mail", "Microsoft Calendar"])
  })
})

function runtimeSkill(
  name: string,
  tenantId: string | null,
  body: string
): RuntimeSkill {
  return {
    id: `${name}-skill`,
    tenantId,
    name,
    description: `${name} description`,
    body,
  }
}

function integration(
  integration: string,
  status: Doc<"integrations">["status"] = "active"
): Doc<"integrations"> {
  return {
    _id: `${integration}-integration`,
    _creationTime: 0,
    tenantId: "tenant",
    integration,
    scope: isUserScopedIntegration(integration) ? "user" : "tenant",
    ownerId: isUserScopedIntegration(integration) ? "user" : undefined,
    externalId: `${integration}-account`,
    email: isUserScopedIntegration(integration)
      ? "user@example.com"
      : undefined,
    credentials: credentials(integration),
    status,
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}

function isUserScopedIntegration(integration: string) {
  return (
    integration === "gmail" ||
    integration === "googleCalendar" ||
    integration === "microsoftEmail" ||
    integration === "microsoftCalendar"
  )
}

function credentials(integration: string) {
  if (integration === "github") {
    return {
      installationId: "123",
      tokens: { access: "github-token" },
      expiresAt: Date.now() + 60_000,
    }
  }

  if (integration === "slack") {
    return {
      bot: "bot-token",
      user: "user-token",
    }
  }

  if (integration === "microsoftEmail" || integration === "microsoftCalendar") {
    return {
      tokens: {
        access: "access-token",
        refresh: "refresh-token",
      },
      expiresAt: Date.now() + 60_000,
      tenantId: "microsoft-tenant",
    }
  }

  return {
    tokens: {
      access: "access-token",
      refresh: "refresh-token",
    },
    expiresAt: Date.now() + 60_000,
  }
}

function runtimeInput() {
  return {
    type: "message",
    messageIntegration: "slack",
    integration: integration("slack"),
    integrations: [integration("slack")],
    message: {
      _id: "message",
      _creationTime: 0,
      tenantId: "tenant",
      integrationId: "slack-integration",
      externalId: "external-message",
      conversationId: "conversation",
      actorId: "actor",
      text: "Please check email.",
      data: { channelId: "C123" },
      createdAt: 0,
    },
  } as unknown as Parameters<typeof assemblePrompt>[0]
}
