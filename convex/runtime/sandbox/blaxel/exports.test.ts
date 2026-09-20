import { beforeEach, expect, test, vi } from "vitest"
import {
  fileTooLargeError,
  maxFileBytes,
} from "../../../../contracts/runtime/files"
import { internal } from "../../../_generated/api"
import { type Id } from "../../../_generated/dataModel"
import { type ActionCtx } from "../../../_generated/server"
import { blobUrl, deleteBlob, storeBlob } from "../../../files/blobs"
import { type UploadedFile } from "../../../files/upload"
import { openSandbox } from "../blaxel"
import { readSandboxFile } from "./client"

vi.mock("../../../files/blobs", () => ({
  blobUrl: vi.fn(),
  deleteBlob: vi.fn(),
  storeBlob: vi.fn(),
}))

vi.mock("./client", () => ({
  readSandboxFile: vi.fn(),
  sandboxName: (sandbox: { metadata: { name: string } }) =>
    sandbox.metadata.name,
}))

import { sandboxFileInfo } from "./files"

vi.mock("./files", () => ({ sandboxFileInfo: vi.fn() }))

import { file } from "./exports"

vi.mock("../blaxel", () => ({ openSandbox: vi.fn() }))

const args = {
  runId: "runs:1" as Id<"runs">,
  path: "output.bin",
  name: "output.bin",
  mimeType: "application/octet-stream",
}
const handler = (
  file as unknown as {
    _handler: (
      ctx: ActionCtx,
      input: typeof args
    ) => Promise<{ sandboxId: string; file: UploadedFile }>
  }
)._handler

beforeEach(() => vi.clearAllMocks())

test.each([17 * 1024 * 1024, maxFileBytes])(
  "exports %i bytes directly to storage and returns metadata only",
  async (size) => {
    const { ctx, runQuery, runMutation, read } = fixture(size)
    const result = await handler(ctx, args)
    expect(result).toEqual({
      sandboxId: "sandbox-1",
      file: { fileId: "files:1", ...fileMetadata(size) },
    })
    expect(runQuery).toHaveBeenCalledWith(internal.runs.records.get, {
      runId: args.runId,
    })
    expect(runMutation).toHaveBeenNthCalledWith(
      1,
      internal.runs.execution.sandboxes.records.claimForRun,
      { runId: args.runId }
    )
    expect(openSandbox).toHaveBeenCalledWith(ctx, {
      runId: args.runId,
      sandboxId: "sandbox-1",
    })
    expect(read).toHaveBeenCalledWith(
      expect.anything(),
      "/home/user/workspace/output.bin"
    )
    expect(vi.mocked(storeBlob).mock.calls[0]?.[1].bytes.byteLength).toBe(size)
    expect(runMutation).toHaveBeenNthCalledWith(2, internal.files.data.record, {
      organizationId: "organization-1",
      runId: args.runId,
      blobKey: "organization-1/blob-1",
      visibility: { mode: "organization" },
      name: args.name,
      mimeType: args.mimeType,
      size,
    })
    expect(deleteBlob).not.toHaveBeenCalled()
  }
)

test.each([
  [0, "File is empty"],
  [maxFileBytes + 1, fileTooLargeError],
])("rejects %i bytes before reading the file", async (size, error) => {
  const { ctx, read } = fixture(Number(size))
  await expect(handler(ctx, args)).rejects.toThrow(String(error))
  expect(read).not.toHaveBeenCalled()
  expect(storeBlob).not.toHaveBeenCalled()
})

test.each([0, maxFileBytes + 1])(
  "rechecks the actual bytes when the file changes to %i bytes",
  async (size) => {
    const { ctx, read } = fixture(1)
    read.mockResolvedValue(new Uint8Array(size))
    await expect(handler(ctx, args)).rejects.toThrow()
    expect(storeBlob).not.toHaveBeenCalled()
  }
)

test("rejects outside paths before querying or opening a sandbox", async () => {
  const { ctx, runQuery } = fixture(1)
  await expect(handler(ctx, { ...args, path: "../private" })).rejects.toThrow(
    "Sandbox path must be inside the Jori workspace."
  )
  expect(runQuery).not.toHaveBeenCalled()
  expect(openSandbox).not.toHaveBeenCalled()
})

test("rejects a missing run before opening a sandbox", async () => {
  const { ctx, runQuery, runMutation } = fixture(1)
  runQuery.mockResolvedValue(null)
  await expect(handler(ctx, args)).rejects.toThrow("Run not found.")
  expect(runMutation).not.toHaveBeenCalled()
  expect(openSandbox).not.toHaveBeenCalled()
})

test("does not accept a caller-supplied sandbox or create one for an export", async () => {
  const { ctx, runMutation } = fixture(1)
  runMutation.mockReset().mockResolvedValueOnce(null)
  await expect(handler(ctx, args)).rejects.toThrow(
    "Run has no sandbox to export from."
  )
  expect(openSandbox).not.toHaveBeenCalled()
})

test("does not upload when the sandbox file is missing", async () => {
  const { ctx, getInfo } = fixture(1)
  getInfo.mockRejectedValue(new Error("File not found"))
  await expect(handler(ctx, args)).rejects.toThrow("File not found")
  expect(storeBlob).not.toHaveBeenCalled()
})

test.each(["/home/user/workspace", "/home/user/workspace/output.bin"])(
  "rejects a symlink at %s before reading bytes",
  async (path) => {
    const { ctx, getInfo, read } = fixture(1)
    getInfo.mockImplementation(async (_sandbox, current) => ({
      size: 1,
      type: current.endsWith(".bin") ? "file" : "dir",
      ...(current === path ? { symlinkTarget: "/outside/fixture" } : {}),
    }))
    await expect(handler(ctx, args)).rejects.toThrow("symbolic links")
    expect(read).not.toHaveBeenCalled()
    expect(storeBlob).not.toHaveBeenCalled()
  }
)

test("rejects a directory at the file path", async () => {
  const { ctx, getInfo, read } = fixture(1)
  getInfo.mockResolvedValue({ size: 1, type: "dir" })
  await expect(handler(ctx, args)).rejects.toThrow("regular file")
  expect(read).not.toHaveBeenCalled()
})

test("removes the stored blob if recording fails", async () => {
  const { ctx, runMutation } = fixture(1)
  runMutation.mockRejectedValueOnce(new Error("Record failed"))
  await expect(handler(ctx, args)).rejects.toThrow("Record failed")
  expect(deleteBlob).toHaveBeenCalledExactlyOnceWith(
    ctx,
    "organization-1/blob-1"
  )
})

test("gets the URL before recording so URL failure cannot leave a broken row", async () => {
  const { ctx, runMutation } = fixture(1)
  vi.mocked(blobUrl).mockRejectedValue(new Error("URL failed"))
  await expect(handler(ctx, args)).rejects.toThrow("URL failed")
  expect(deleteBlob).toHaveBeenCalledExactlyOnceWith(
    ctx,
    "organization-1/blob-1"
  )
  expect(runMutation).toHaveBeenCalledTimes(1)
})

function fileMetadata(size: number) {
  return {
    name: args.name,
    mimeType: args.mimeType,
    size,
    url: "https://account.eu.r2.cloudflarestorage.com/blob-1?signed",
  }
}

function fixture(size: number) {
  const getInfo = vi.mocked(sandboxFileInfo).mockImplementation(
    async (
      _sandbox: unknown,
      path: string
    ): Promise<{
      size: number
      type: string
      symlinkTarget?: string
    }> => ({ size, type: path.endsWith(".bin") ? "file" : "dir" })
  )
  const read = vi
    .mocked(readSandboxFile)
    .mockImplementation(async () => new Uint8Array(size))
  vi.mocked(openSandbox).mockResolvedValue({
    metadata: { name: "sandbox-1" },
  } as unknown as Awaited<ReturnType<typeof openSandbox>>)
  vi.mocked(storeBlob).mockResolvedValue("organization-1/blob-1")
  vi.mocked(blobUrl).mockResolvedValue(fileMetadata(size).url)
  const runQuery = vi.fn(
    async (): Promise<{ organizationId: string } | null> => ({
      organizationId: "organization-1",
    })
  )
  const runMutation = vi
    .fn(async (): Promise<unknown> => "files:1")
    .mockResolvedValueOnce({ externalId: "sandbox-1" })
  return {
    ctx: { runQuery, runMutation } as unknown as ActionCtx,
    runQuery,
    runMutation,
    getInfo,
    read,
  }
}
