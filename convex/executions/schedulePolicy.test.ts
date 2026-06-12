import { expect, test } from "vitest"
import { resolveToolModes } from "../permissions/catalog"
import { integration, runtimeMilo } from "./permissions.fixtures"
import { assembleToolsForRun } from "./tools"

test("restricts scheduled selected integrations to declared access", () => {
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [integration("github"), integration("slack")],
    scheduleOutput: {
      readScope: "selected",
      webSearch: true,
      surfaces: [
        { provider: "github", access: "read" },
        { provider: "slack", access: "write" },
      ],
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

test("allows all connected reads without broadening scheduled writes", () => {
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [integration("github"), integration("notion")],
    scheduleOutput: {
      readScope: "allConnected",
      webSearch: true,
      surfaces: [{ provider: "notion", access: "write" }],
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
