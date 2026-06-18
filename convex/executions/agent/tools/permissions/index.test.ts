import { expect, test } from "vitest"
import {
  resolveToolMode,
  resolveToolModes,
  toolPermissions,
} from "../../../../permissions/catalog"
import { createCodexConfig } from "../../codex"
import { assembleToolsForRun } from ".."
import { getSurfaceToolDefinitions } from "../definitions"
import {
  integration,
  readProperties,
  readRequired,
  runtimeMilo,
} from "../fixtures"

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

test("includes general GitHub tools without provider defaults", () => {
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

test("includes Gmail send and draft tools with message schemas", () => {
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [integration("gmail")],
    toolModes: resolveToolModes([]),
  })
  const gmailServer = toolBundle.mcpServers.find(
    (server) => server.name === "gmail"
  )
  const enabledTools = gmailServer?.env.MILO_ENABLED_TOOLS.split(",") ?? []
  const tools = getSurfaceToolDefinitions("gmail", {
    toolModes: resolveToolModes([]),
  })
  const sendMessage = tools.find(
    (tool) => tool.name === "google_gmail_send_message"
  )
  const createDraft = tools.find(
    (tool) => tool.name === "google_gmail_create_draft"
  )

  expect(enabledTools).toContain("google_gmail_reply_to_thread")
  expect(enabledTools).toContain("google_gmail_send_message")
  expect(enabledTools).toContain("google_gmail_create_draft")
  expect(readRequired(sendMessage?.inputSchema)).toEqual([
    "to",
    "subject",
    "body",
  ])
  expect(readProperties(sendMessage?.inputSchema)).toHaveProperty("to")
  expect(readProperties(sendMessage?.inputSchema)).toHaveProperty("cc")
  expect(readProperties(sendMessage?.inputSchema)).toHaveProperty("bcc")
  expect(readProperties(sendMessage?.inputSchema)).toHaveProperty("attachments")
  expect(readProperties(createDraft?.inputSchema)).toHaveProperty("to")
})

test("includes Google Drive tools with file content schemas", () => {
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [integration("googleDrive")],
    toolModes: resolveToolModes([]),
  })
  const driveServer = toolBundle.mcpServers.find(
    (server) => server.name === "googleDrive"
  )
  const enabledTools = driveServer?.env.MILO_ENABLED_TOOLS.split(",") ?? []
  const tools = getSurfaceToolDefinitions("googleDrive", {
    toolModes: resolveToolModes([]),
  })
  const createFile = tools.find(
    (tool) => tool.name === "google_drive_create_file"
  )
  const readFile = tools.find((tool) => tool.name === "google_drive_read_file")

  expect(enabledTools).toContain("google_drive_search_files")
  expect(enabledTools).toContain("google_drive_read_file")
  expect(enabledTools).toContain("google_drive_create_file")
  expect(enabledTools).toContain("google_drive_update_file")
  expect(readRequired(createFile?.inputSchema)).toEqual(["name", "content"])
  expect(readProperties(createFile?.inputSchema)).toHaveProperty("parents")
  expect(readProperties(readFile?.inputSchema)).toHaveProperty("exportMimeType")
  expect(
    toolBundle.capabilities.map((capability) => capability.label)
  ).toContain("Google Drive")
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

test("does not pass issue defaults into Linear tools", () => {
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
  const tools = getSurfaceToolDefinitions("notion", {
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
  const tools = getSurfaceToolDefinitions("notion", { toolModes })
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

test("wraps prompted Milo automation schemas with approval metadata", () => {
  const toolModes = resolveToolModes([
    { tool: "add_automation", mode: "prompted" },
  ])
  const tools = getSurfaceToolDefinitions("milo", {
    toolModes,
  })
  const addAutomation = tools.find((tool) => tool.name === "add_automation")
  const search = tools.find((tool) => tool.name === "search_automations")

  expect(readRequired(addAutomation?.inputSchema)).toContain("approval")
  expect(readProperties(addAutomation?.inputSchema)).toHaveProperty("approval")
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
      integration("googleDrive"),
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

  // Codex enables web search only via the top-level string key; the [tools]
  // boolean form is silently ignored.
  expect(config).toContain('web_search = "live"')
  expect(config).toContain('sandbox_mode = "workspace-write"')

  expect(config).toContain(
    'enabled_tools = ["save_file", "search_files", "read_file", "search_artifacts", "read_artifact", "read_artifact_state", "create_artifact", "update_artifact", "delete_artifact", "update_artifact_state", "search_automations", "read_automation", "add_automation", "update_automation", "delete_automation"]'
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
