import { describe, expect, test } from "vitest"
import {
  getToolPermissionsBySurface,
  resolveToolModes,
} from "../../../permissions/catalog"
import { runtimeAssets } from "../../../runtime/_generated/assets"
import { createBrokeredToolBundle } from "./brokered"
import { createMiloToolBundle } from "./milo/bundle"

describe("runtime MCP payloads", () => {
  test("passes Milo tool definitions as env config", () => {
    const bundle = createMiloToolBundle({
      convexSiteUrl: "https://convex.example",
      executionToken: "execution-token",
      executionType: "automation",
      permissions: getToolPermissionsBySurface("milo"),
      toolModes: resolveToolModes([]),
    })
    const server = bundle.mcpServers.find(
      (candidate) => candidate.name === "milo"
    )

    expect(bundle.sandboxFiles).toContainEqual({
      path: "/home/user/milo-workspace/milo-mcp.ts",
      content: runtimeAssets.mcp.milo,
    })
    expect(bundle.sandboxFiles).toContainEqual({
      path: "/home/user/milo-workspace/milo/files.ts",
      content: runtimeAssets.mcp.miloFiles["milo/files.ts"],
    })
    expect(server?.args).toEqual([
      "--experimental-strip-types",
      "/home/user/milo-workspace/milo-mcp.ts",
    ])
    expect(server?.env.MILO_TOOL_DEFINITIONS_BASE64).toBeDefined()
    expect(runtimeAssets.mcp.milo).not.toContain(
      "Validate, store, and publish a new Milo artifact."
    )
  })

  test("passes brokered tool definitions and surface as env config", () => {
    const bundle = createBrokeredToolBundle({
      broker: {
        convexSiteUrl: "https://convex.example",
        executionToken: "execution-token",
      },
      executionType: "automation",
      permissions: getToolPermissionsBySurface("github"),
      preflight: {
        type: "github",
        credentials: {
          installationId: "123",
          tokens: { access: "github-token" },
          expiresAt: Date.now() + 60_000,
        },
      },
      toolModes: resolveToolModes([]),
    })
    const server = bundle.mcpServers.find(
      (candidate) => candidate.name === "github"
    )

    expect(server?.env.MILO_TOOL_SURFACE).toBe("github")
    expect(server?.args).toEqual([
      "--experimental-strip-types",
      "/home/user/milo-workspace/milo-github-mcp.ts",
    ])
    expect(server?.env.MILO_TOOL_DEFINITIONS_BASE64).toBeDefined()
    expect(runtimeAssets.mcp.broker).not.toContain("github_create_issue")
  })
})
