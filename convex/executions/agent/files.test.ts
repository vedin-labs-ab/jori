import { expect, test } from "vitest"
import { resolveToolModes } from "../../permissions/catalog"
import { assembleToolsForRun } from "./tools"
import { getSurfaceToolDefinitions } from "./tools/definitions"
import {
  readProperties,
  readRequired,
  runtimeMilo,
} from "./tools/permissions/fixtures"

test("includes file tools in Milo tools", () => {
  const toolBundle = assembleToolsForRun({
    milo: runtimeMilo(),
    integrations: [],
    toolModes: resolveToolModes([{ tool: "save_file", mode: "blocked" }]),
  })
  const miloServer = toolBundle.mcpServers.find(
    (server) => server.name === "milo"
  )
  const tools = getSurfaceToolDefinitions("milo", {
    toolModes: resolveToolModes([]),
  })
  const saveFile = tools.find((tool) => tool.name === "save_file")
  const searchFiles = tools.find((tool) => tool.name === "search_files")
  const readFile = tools.find((tool) => tool.name === "read_file")

  expect(miloServer?.env.MILO_ENABLED_TOOLS.split(",")).toContain("save_file")
  expect(miloServer?.env.MILO_ENABLED_TOOLS.split(",")).toContain(
    "search_files"
  )
  expect(miloServer?.env.MILO_ENABLED_TOOLS.split(",")).toContain("read_file")
  expect(readRequired(saveFile?.inputSchema)).toEqual(["path"])
  expect(readProperties(saveFile?.inputSchema)).toHaveProperty("path")
  expect(readProperties(searchFiles?.inputSchema)).toHaveProperty("query")
  expect(readRequired(readFile?.inputSchema)).toEqual(["fileId"])
})
