import { expect, test, vi } from "vitest"
import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { RemoteSandbox } from "./remote"

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
    internal.runtime.sandbox.e2b.imports.file,
    {
      runId: "runs:1",
      fileId: "files:1",
      path: "image.png",
    }
  )
  await sandbox.writeFiles([{ path: "note.txt", content: "saved" }])
  expect(runAction).toHaveBeenLastCalledWith(
    internal.runtime.sandbox.e2b.write,
    {
      runId: "runs:1",
      sandboxId: "sandbox-1",
      files: [{ path: "note.txt", content: "saved" }],
    }
  )
})
