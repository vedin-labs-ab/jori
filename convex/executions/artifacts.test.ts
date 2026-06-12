import { expect, test } from "vitest"
import { resolveToolModes } from "../permissions/catalog"
import { assembleToolsForRun } from "./tools"
import { getProviderToolDefinitions } from "./tools/definitions"
import {
  readProperties,
  readRequired,
  runtimeMilo,
} from "./tools/permissions.fixtures"

test("includes artifact tools in Milo tools", () => {
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [],
    toolModes: resolveToolModes([{ tool: "save_artifact", mode: "blocked" }]),
  })
  const miloServer = toolBundle.mcpServers.find(
    (server) => server.name === "milo"
  )
  const tools = getProviderToolDefinitions("milo", {
    toolModes: resolveToolModes([]),
  })
  const saveArtifact = tools.find((tool) => tool.name === "save_artifact")
  const searchArtifacts = tools.find((tool) => tool.name === "search_artifacts")
  const readArtifact = tools.find((tool) => tool.name === "read_artifact")

  expect(miloServer?.env.MILO_ENABLED_TOOLS.split(",")).toContain(
    "save_artifact"
  )
  expect(miloServer?.env.MILO_ENABLED_TOOLS.split(",")).toContain(
    "search_artifacts"
  )
  expect(miloServer?.env.MILO_ENABLED_TOOLS.split(",")).toContain(
    "read_artifact"
  )
  expect(readRequired(saveArtifact?.inputSchema)).toEqual(["path"])
  expect(readProperties(saveArtifact?.inputSchema)).toHaveProperty("path")
  expect(readProperties(searchArtifacts?.inputSchema)).toHaveProperty("query")
  expect(readRequired(readArtifact?.inputSchema)).toEqual(["artifactId"])
})
