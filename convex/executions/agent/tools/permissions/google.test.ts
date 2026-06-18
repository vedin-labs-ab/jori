import { expect, test } from "vitest"
import { resolveToolModes } from "../../../../permissions/catalog"
import { assembleToolsForRun } from ".."
import { getSurfaceToolDefinitions } from "../definitions"
import { integration, readRequired, runtimeMilo } from "./fixtures"

test("includes Gmail batch read tools with ID array schemas", () => {
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
  const getThreads = tools.find(
    (tool) => tool.name === "google_gmail_get_threads"
  )
  const getMessages = tools.find(
    (tool) => tool.name === "google_gmail_get_messages"
  )

  expect(enabledTools).toContain("google_gmail_get_threads")
  expect(enabledTools).toContain("google_gmail_get_messages")
  expect(readRequired(getThreads?.inputSchema)).toEqual(["threadIds"])
  expect(readRequired(getMessages?.inputSchema)).toEqual(["messageIds"])
})
