import { expect, test } from "vitest"
import { resolveToolModes } from "../../../../permissions/catalog"
import { assembleToolsForRun } from ".."
import { integration, runtimeMilo } from "./fixtures"

const reviewReplyTool = "github_reply_to_pull_request_review_comment"

test("includes GitHub review comment replies without provider defaults", () => {
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [integration("github")],
    toolModes: resolveToolModes([]),
  })
  const githubServer = toolBundle.mcpServers.find(
    (server) => server.name === "github"
  )

  expect(githubServer?.env.MILO_ENABLED_TOOLS.split(",")).toContain(
    reviewReplyTool
  )
  expect(githubServer?.env.MILO_GITHUB_OWNER).toBeUndefined()
  expect(githubServer?.env.MILO_GITHUB_REPO).toBeUndefined()
})

test("keeps GitHub review comment replies required", () => {
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [integration("github")],
    toolModes: resolveToolModes([{ tool: reviewReplyTool, mode: "blocked" }]),
  })
  const githubServer = toolBundle.mcpServers.find(
    (server) => server.name === "github"
  )

  expect(githubServer?.env.MILO_ENABLED_TOOLS.split(",")).toContain(
    reviewReplyTool
  )
  expect(toolBundle.promptedTools.map((tool) => tool.tool)).not.toContain(
    reviewReplyTool
  )
})
