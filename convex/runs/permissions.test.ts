import { expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { resolveToolModes } from "../permissions/catalog"
import { assembleToolsForRun } from "./tools"

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
  expect(toolBundle.skillNames).toContain("github")
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

  return {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: Date.now() + 60_000,
  }
}
