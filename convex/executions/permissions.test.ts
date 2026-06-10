import { expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import {
  resolveToolMode,
  resolveToolModes,
  toolPermissions,
} from "../permissions/catalog"
import { createCodexConfig } from "./codex"
import { assembleToolsForRun } from "./tools"
import { getProviderToolDefinitions } from "./tools/definitions"

test("keeps delivery tools required and out of approval prompts", () => {
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [integration("slack")],
    toolModes: resolveToolModes([
      { tool: "conversations_add_message", mode: "blocked" },
    ]),
  })
  const slackServer = toolBundle.mcpServers.find(
    (server) => server.name === "slack"
  )

  expect(slackServer?.env.MILO_ENABLED_TOOLS.split(",")).toContain(
    "conversations_add_message"
  )
  expect(toolBundle.promptedTools.map((tool) => tool.tool)).not.toContain(
    "conversations_add_message"
  )
})

test("includes general GitHub tools for non-GitHub triggers", () => {
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [integration("github")],
    toolModes: resolveToolModes([]),
  })
  const githubServer = toolBundle.mcpServers.find(
    (server) => server.name === "github"
  )
  const enabledTools = githubServer?.env.MILO_ENABLED_TOOLS.split(",") ?? []

  expect(enabledTools).toContain("github_list_repositories")
  expect(enabledTools).toContain("github_search_issues")
  expect(enabledTools).toContain("github_add_issue_comment")
  expect(githubServer?.env.MILO_GITHUB_OWNER).toBeUndefined()
  expect(githubServer?.env.MILO_GITHUB_REPO).toBeUndefined()
  expect(toolBundle.skillNames).not.toContain("github")
})

test("keeps GitHub comments required and out of approval prompts", () => {
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [integration("github")],
    toolModes: resolveToolModes([
      { tool: "github_add_issue_comment", mode: "blocked" },
    ]),
  })
  const githubServer = toolBundle.mcpServers.find(
    (server) => server.name === "github"
  )

  expect(githubServer?.env.MILO_ENABLED_TOOLS.split(",")).toContain(
    "github_add_issue_comment"
  )
  expect(toolBundle.promptedTools.map((tool) => tool.tool)).not.toContain(
    "github_add_issue_comment"
  )
})

test("does not pass trigger issue defaults into Linear tools", () => {
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [integration("linear")],
    toolModes: resolveToolModes([]),
  })
  const linearServer = toolBundle.mcpServers.find(
    (server) => server.name === "linear"
  )

  expect(linearServer?.env.MILO_LINEAR_DEFAULT_ISSUE_ID).toBeUndefined()
})

test("defaults all configurable tool permissions to allowed", () => {
  const modes = resolveToolModes([])

  for (const permission of toolPermissions) {
    expect(resolveToolMode(modes, permission.tool)).toBe(
      permission.defaultMode === "required" ? "required" : "allowed"
    )
  }
})

test("wraps prompted write tool schemas with approval metadata", () => {
  const toolModes = resolveToolModes([
    { tool: "notion_create_page", mode: "prompted" },
  ])
  const tools = getProviderToolDefinitions("notion", {
    toolModes,
  })
  const createPage = tools.find((tool) => tool.name === "notion_create_page")
  const search = tools.find((tool) => tool.name === "notion_search")

  expect(readRequired(createPage?.inputSchema)).toContain("approval")
  expect(readProperties(createPage?.inputSchema)).toHaveProperty("approval")
  expect(readRequired(search?.inputSchema)).not.toContain("approval")
  expect(readProperties(search?.inputSchema)).not.toHaveProperty("approval")
})

test("wraps prompted read tool schemas with approval metadata", () => {
  const toolModes = resolveToolModes([
    { tool: "notion_search", mode: "prompted" },
  ])
  const tools = getProviderToolDefinitions("notion", { toolModes })
  const search = tools.find((tool) => tool.name === "notion_search")

  expect(readRequired(search?.inputSchema)).toContain("approval")
  expect(readProperties(search?.inputSchema)).toHaveProperty("approval")
})

test("includes prompted read tools in runtime approval prompts", () => {
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [integration("slack")],
    toolModes: resolveToolModes([
      { tool: "conversations_history", mode: "prompted" },
    ]),
  })
  const slackServer = toolBundle.mcpServers.find(
    (server) => server.name === "slack"
  )

  expect(slackServer?.env.MILO_ENABLED_TOOLS.split(",")).toContain(
    "conversations_history"
  )
  expect(toolBundle.promptedTools.map((tool) => tool.tool)).toContain(
    "conversations_history"
  )
})

test("wraps prompted Milo schedule schemas with approval metadata", () => {
  const toolModes = resolveToolModes([
    { tool: "add_schedule", mode: "prompted" },
  ])
  const tools = getProviderToolDefinitions("milo", {
    toolModes,
  })
  const addSchedule = tools.find((tool) => tool.name === "add_schedule")
  const search = tools.find((tool) => tool.name === "search_schedules")

  expect(readRequired(addSchedule?.inputSchema)).toContain("approval")
  expect(readProperties(addSchedule?.inputSchema)).toHaveProperty("approval")
  expect(readRequired(search?.inputSchema)).not.toContain("approval")
  expect(readProperties(search?.inputSchema)).not.toHaveProperty("approval")
})

test("keeps provider credentials out of sandbox MCP config", () => {
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [
      integration("slack"),
      integration("github"),
      integration("linear"),
      integration("gmail"),
      integration("googleCalendar"),
      integration("notion"),
      integration("microsoftEmail"),
      integration("microsoftCalendar"),
    ],
    toolModes: resolveToolModes([]),
  })
  const config = createCodexConfig({
    mcpServers: toolBundle.mcpServers,
  })

  for (const secret of [
    "bot-token",
    "user-token",
    "github-token",
    "access-token",
  ]) {
    expect(config).not.toContain(secret)
  }

  expect(config).toContain(
    'enabled_tools = ["search_schedules", "read_schedule", "add_schedule", "update_schedule", "delete_schedule"]'
  )

  for (const server of toolBundle.mcpServers) {
    expect(server.env).not.toHaveProperty("MILO_SLACK_BOT_TOKEN")
    expect(server.env).not.toHaveProperty("MILO_SLACK_USER_TOKEN")
    expect(server.env).not.toHaveProperty("MILO_GITHUB_TOKEN")
    expect(server.env).not.toHaveProperty("MILO_LINEAR_ACCESS_TOKEN")
    expect(server.env).not.toHaveProperty("MILO_GOOGLE_ACCESS_TOKEN")
    expect(server.env).not.toHaveProperty("MILO_NOTION_ACCESS_TOKEN")
    expect(server.env).not.toHaveProperty("MILO_MICROSOFT_ACCESS_TOKEN")
  }
})

function runtimeMilo() {
  return {
    convexSiteUrl: "https://convex.example",
    executionToken: "execution-token",
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

function readProperties(schema: unknown) {
  if (
    typeof schema !== "object" ||
    schema === null ||
    !("properties" in schema)
  ) {
    return {}
  }

  const properties = schema.properties

  return typeof properties === "object" && properties !== null ? properties : {}
}

function readRequired(schema: unknown) {
  if (
    typeof schema !== "object" ||
    schema === null ||
    !("required" in schema)
  ) {
    return []
  }

  return Array.isArray(schema.required) ? schema.required : []
}
