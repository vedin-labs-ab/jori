import { expect, test, vi } from "vitest"
import { type UploadedFile } from "../../../contracts/runtime/files"
import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { RemoteSandbox } from "./remote"

test("exports by run and path without transporting file bytes", async () => {
  const file: UploadedFile = {
    fileId: "files:1" as Id<"files">,
    mimeType: "application/octet-stream",
    name: "large.bin",
    size: 17 * 1024 * 1024,
    url: null,
  }
  const runAction = vi.fn(async () => ({ sandboxId: "sandbox-1", file }))
  const sandbox = new RemoteSandbox(
    { runAction } as unknown as ActionCtx,
    "runs:1" as Id<"runs">,
    null
  )
  await expect(
    sandbox.exportFile({
      path: "large.bin",
      name: file.name,
      mimeType: file.mimeType,
    })
  ).resolves.toEqual(file)
  expect(runAction).toHaveBeenCalledExactlyOnceWith(
    internal.runtime.sandbox.blaxel.exports.file,
    {
      runId: "runs:1",
      path: "large.bin",
      name: file.name,
      mimeType: file.mimeType,
    }
  )
  await sandbox.writeFiles([{ path: "note.txt", content: "saved" }])
  expect(runAction.mock.calls[1]).toEqual([
    internal.runtime.sandbox.blaxel.write,
    {
      runId: "runs:1",
      sandboxId: "sandbox-1",
      files: [{ path: "note.txt", content: "saved" }],
    },
  ])
})

test("imports by file reference and remembers the run-owned sandbox", async () => {
  const runAction = vi.fn(async () => ({ sandboxId: "sandbox-1" }))
  const sandbox = new RemoteSandbox(
    { runAction } as unknown as ActionCtx,
    "runs:1" as Id<"runs">,
    null
  )
  await sandbox.importFile({
    fileId: "files:1" as Id<"files">,
    path: "image.png",
  })
  expect(runAction).toHaveBeenCalledWith(
    internal.runtime.sandbox.blaxel.imports.file,
    {
      runId: "runs:1",
      fileId: "files:1",
      path: "image.png",
    }
  )
  await sandbox.writeFiles([{ path: "note.txt", content: "saved" }])
  expect(runAction).toHaveBeenLastCalledWith(
    internal.runtime.sandbox.blaxel.write,
    {
      runId: "runs:1",
      sandboxId: "sandbox-1",
      files: [{ path: "note.txt", content: "saved" }],
    }
  )
})
