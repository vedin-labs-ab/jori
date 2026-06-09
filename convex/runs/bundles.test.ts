import { describe, expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import {
  getToolPermissionsByProvider,
  resolveToolModes,
} from "../permissions/catalog"
import { filterRuntimeSkillsForBundle } from "./bundles"
import { assemblePrompt, type RuntimeSkill } from "./prompt"
import { assembleToolsForRun } from "./tools"

describe("runtime integration bundles", () => {
  test("omits built-in provider skills when every provider tool is blocked", () => {
    const toolModes = resolveToolModes(
      getToolPermissionsByProvider("gmail").map((permission) => ({
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
        runtimeSkill("gmail", null, "Use google_gmail_search_threads."),
        runtimeSkill("scheduling", null, "Use add_schedule."),
        runtimeSkill("email-style", "tenant", "Keep email concise."),
      ],
      toolBundle.skillNames
    )
    const prompt = assemblePrompt(runtimeInput(), promptSkills)

    expect(toolBundle.mcpServers.map((server) => server.name)).not.toContain(
      "gmail"
    )
    expect(toolBundle.skillNames).not.toContain("gmail")
    expect(prompt.skillIds).toEqual(["scheduling", "email-style"])
    expect(prompt.rendered).not.toContain("google_gmail_search_threads")
    expect(prompt.rendered).toContain("Keep email concise.")
  })

  test("deduplicates shared provider skills when any bundled tool remains", () => {
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

    expect(
      toolBundle.skillNames.filter((skillName) => skillName === "microsoft")
    ).toHaveLength(1)
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

function integration(provider: string): Doc<"integrations"> {
  return {
    _id: `${provider}-integration`,
    _creationTime: 0,
    tenantId: "tenant",
    provider,
    scope: "tenant",
    accountId: `${provider}-account`,
    credentials: credentials(provider),
    status: "active",
    createdAt: 0,
  } as Doc<"integrations">
}

function credentials(provider: string) {
  if (provider === "github") {
    return {
      installationId: "123",
      token: "github-token",
      expiresAt: Date.now() + 60_000,
    }
  }

  if (provider === "slack") {
    return {
      bot: "bot-token",
      user: "user-token",
    }
  }

  if (provider === "microsoftEmail" || provider === "microsoftCalendar") {
    return {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 60_000,
      tenantId: "microsoft-tenant",
    }
  }

  return {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: Date.now() + 60_000,
  }
}

function runtimeInput() {
  return {
    type: "message",
    provider: "slack",
    execution: {
      _id: "execution",
      _creationTime: 0,
      tenantId: "tenant",
      triggerId: "trigger",
      status: "pending",
      startedAt: 0,
      updatedAt: 0,
    },
    trigger: {
      _id: "trigger",
      _creationTime: 0,
      tenantId: "tenant",
      type: "message",
      provider: "slack",
      status: "active",
      createdAt: 0,
    },
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
