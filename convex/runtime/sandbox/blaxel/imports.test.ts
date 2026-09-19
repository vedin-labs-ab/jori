import { beforeEach, expect, test, vi } from "vitest"
import { maxFileBytes } from "../../../../contracts/runtime/files"
import { internal } from "../../../_generated/api"
import { type Id } from "../../../_generated/dataModel"
import { type ActionCtx } from "../../../_generated/server"
import { readBlob } from "../../../files/blobs"
import { openSandbox } from "../blaxel"
import { file } from "./imports"

vi.mock("../../../files/blobs", () => ({ readBlob: vi.fn() }))

vi.mock("../blaxel", () => ({ openSandbox: vi.fn() }))

const args = {
  fileId: "files:1" as Id<"files">,
  runId: "runs:1" as Id<"runs">,
  path: "generated-images/image.png",
}
const handler = (
  file as unknown as {
    _handler: (
      ctx: ActionCtx,
      input: typeof args
    ) => Promise<{ sandboxId: string }>
  }
)._handler
const write = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(openSandbox).mockResolvedValue({
    metadata: { name: "sandbox-1" },
    fs: { writeBinary: write },
  } as unknown as Awaited<ReturnType<typeof openSandbox>>)
})

test("imports more than 5 MiB directly from regional storage with run ownership", async () => {
  const blob = new Blob([new Uint8Array(6 * 1024 * 1024)])
  const { ctx, runQuery, runMutation } = context(blob)
  await expect(handler(ctx, args)).resolves.toEqual({ sandboxId: "sandbox-1" })
  expect(runQuery).toHaveBeenCalledWith(internal.files.data.forRun, {
    fileId: args.fileId,
    runId: args.runId,
  })
  expect(readBlob).toHaveBeenCalledWith("organization-1/blob-1")
  expect(runMutation).toHaveBeenCalledWith(
    internal.runs.execution.sandboxes.records.claimForRun,
    { runId: args.runId }
  )
  expect(openSandbox).toHaveBeenCalledWith(ctx, {
    runId: args.runId,
    sandboxId: "sandbox-1",
  })
  expect(write).toHaveBeenCalledWith(
    "/home/user/workspace/generated-images/image.png",
    expect.any(Uint8Array)
  )
  expect(write.mock.calls[0]?.[1].byteLength).toBe(blob.size)
})

test("rejects paths outside the workspace before reading storage", async () => {
  const { ctx, runQuery } = context(new Blob())
  await expect(handler(ctx, { ...args, path: "../private" })).rejects.toThrow(
    "Sandbox path must be inside the Jori workspace."
  )
  expect(runQuery).not.toHaveBeenCalled()
})

test("rejects missing blobs without starting a sandbox", async () => {
  const { ctx } = context(null)
  await expect(handler(ctx, args)).rejects.toThrow("Stored file was not found.")
  expect(openSandbox).not.toHaveBeenCalled()
})

test("enforces the size limit before loading bytes", async () => {
  const { ctx } = context(new Blob(), maxFileBytes + 1)
  await expect(handler(ctx, args)).rejects.toThrow()
  expect(readBlob).not.toHaveBeenCalled()
  expect(openSandbox).not.toHaveBeenCalled()
})

test("also checks actual blob size before opening a sandbox", async () => {
  const { ctx } = context(new Blob([new Uint8Array(maxFileBytes + 1)]), 1)
  await expect(handler(ctx, args)).rejects.toThrow()
  expect(openSandbox).not.toHaveBeenCalled()
})

function context(blob: Blob | null, size = blob?.size ?? 0) {
  vi.mocked(readBlob).mockResolvedValue(blob)
  const runQuery = vi.fn(async () => ({
    blobKey: "organization-1/blob-1",
    size,
  }))
  const runMutation = vi.fn(async () => ({ externalId: "sandbox-1" }))
  return {
    ctx: { runQuery, runMutation } as unknown as ActionCtx,
    runQuery,
    runMutation,
  }
}
