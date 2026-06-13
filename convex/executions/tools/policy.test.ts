import { expect, test } from "vitest"
import { resolveToolModes } from "../../permissions/catalog"
import { assembleToolsForRun } from "."
import { integration, runtimeMilo } from "./permissions.fixtures"

test("restricts automation selected integrations to declared access", () => {
  const github = integration("github")
  const slack = integration("slack")
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [github, slack],
    access: {
      read: [github._id],
      write: [slack._id],
      web: true,
    },
    toolModes: resolveToolModes([]),
  })
  const githubTools = enabledTools(toolBundle, "github")
  const slackTools = enabledTools(toolBundle, "slack")

  expect(githubTools).toContain("github_get_issue")
  expect(githubTools).not.toContain("github_add_issue_comment")
  expect(slackTools).toEqual(["conversations_add_message"])
  expect(toolBundle.skillNames).toContain("slack")
})

test("allows all connected reads without broadening automation writes", () => {
  const github = integration("github")
  const notion = integration("notion")
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [github, notion],
    access: {
      read: "all",
      write: [notion._id],
      web: true,
    },
    toolModes: resolveToolModes([]),
  })
  const githubTools = enabledTools(toolBundle, "github")
  const notionTools = enabledTools(toolBundle, "notion")

  expect(githubTools).toContain("github_get_issue")
  expect(githubTools).not.toContain("github_add_issue_comment")
  expect(notionTools).toContain("notion_create_page")
  expect(notionTools).toContain("notion_search")
})

test("omits prompted tools from automation runs", () => {
  const notion = integration("notion")
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [notion],
    access: {
      read: [notion._id],
      write: [notion._id],
      web: true,
    },
    executionType: "automation",
    toolModes: resolveToolModes([
      { tool: "notion_search", mode: "prompted" },
      { tool: "notion_create_page", mode: "prompted" },
    ]),
  })
  const notionTools = enabledTools(toolBundle, "notion")

  expect(notionTools).not.toContain("notion_search")
  expect(notionTools).not.toContain("notion_create_page")
  expect(toolBundle.promptedTools).toEqual([])
})

function enabledTools(
  toolBundle: ReturnType<typeof assembleToolsForRun>,
  serverName: string
) {
  return (
    toolBundle.mcpServers
      .find((server) => server.name === serverName)
      ?.env.MILO_ENABLED_TOOLS.split(",") ?? []
  )
}
