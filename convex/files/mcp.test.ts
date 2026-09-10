import { expect, test, vi } from "vitest"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { callJoriTool } from "../broker/jori"
import { callJoriFileTool, isJoriFileTool } from "./mcp"

const personId = "person-id" as Id<"persons">

test("recognizes exactly the renamed file tools", () => {
  expect(isJoriFileTool("search_files")).toBe(true)
  expect(isJoriFileTool("read_file")).toBe(true)
  expect(isJoriFileTool("share_file")).toBe(true)
  expect(isJoriFileTool("save_file")).toBe(false)
  expect(isJoriFileTool("search_assets")).toBe(false)
  expect(isJoriFileTool("read_asset")).toBe(false)
})

test("dispatches search_files with the run principal as viewer", async () => {
  const runQuery = vi.fn(async () => [])
  const ctx = { runQuery } as unknown as ActionCtx

  await callJoriTool(
    ctx,
    {
      organizationId: "organization",
      principal: { kind: "person", personId },
    },
    {
      tool: "search_files",
      args: {
        query: "report",
        limit: 5,
        organizationId: "forged",
        personId: "forged",
        runId: "forged",
      },
    }
  )

  expect(runQuery).toHaveBeenCalledWith(internal.files.data.search, {
    organizationId: "organization",
    personId,
    runId: undefined,
    query: "report",
    limit: 5,
  })
})

test("dispatches read_file without a person for organization runs", async () => {
  const runQuery = vi.fn(async () => null)
  const ctx = { runQuery } as unknown as ActionCtx

  await callJoriTool(
    ctx,
    { organizationId: "organization", principal: { kind: "organization" } },
    { tool: "read_file", args: { fileId: "file-id" } }
  )

  expect(runQuery).toHaveBeenCalledWith(internal.files.data.read, {
    organizationId: "organization",
    personId: undefined,
    fileId: "file-id",
  })
})

test("dispatches share_file to the share mint with the person", async () => {
  const runMutation = vi.fn(async () => ({ url: "u", expiresAt: 1 }))
  const ctx = { runMutation } as unknown as ActionCtx

  await callJoriTool(
    ctx,
    { organizationId: "organization", principal: { kind: "person", personId } },
    { tool: "share_file", args: { fileId: "file-id", expiresInHours: 24 } }
  )

  expect(runMutation).toHaveBeenCalledWith(internal.files.share.mint, {
    organizationId: "organization",
    personId,
    fileId: "file-id",
    expiresInHours: 24,
  })
})

test("shared file tools use the trusted run audience instead of a supplied viewer", async () => {
  const runId = "shared-run" as Id<"runs">
  const runMutation = vi.fn(async () => ({ url: "u", expiresAt: 1 }))
  const ctx = { runMutation } as unknown as ActionCtx
  await callJoriTool(
    ctx,
    {
      _id: runId,
      organizationId: "organization",
      principal: { kind: "organization" },
    },
    {
      tool: "share_file",
      args: { fileId: "file-id", personId, runId: "forged" },
    }
  )
  expect(runMutation).toHaveBeenCalledWith(internal.files.share.mint, {
    organizationId: "organization",
    personId: undefined,
    runId,
    fileId: "file-id",
    expiresInHours: undefined,
  })
})

test("rejects unknown file tools", async () => {
  const ctx = { runQuery: vi.fn() } as unknown as ActionCtx

  await expect(
    callJoriFileTool(
      ctx,
      { organizationId: "organization" },
      { tool: "read_asset", args: {} }
    )
  ).rejects.toThrow("Unknown Jori file tool: read_asset")
})
