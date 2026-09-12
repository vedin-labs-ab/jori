"use node"

import { v } from "convex/values"
import {
  fileTooLargeError,
  maxFileBytes,
  type UploadedFile,
} from "../../../../contracts/runtime/files"
import { internal } from "../../../_generated/api"
import { internalAction } from "../../../_generated/server"
import { uploadRunFile } from "../../../files/upload"
import { openSandbox } from "../blaxel"
import { sandboxFilePath } from "../path"
import { type BlaxelSandbox, readSandboxFile, sandboxName } from "./client"
import { sandboxFileInfo } from "./files"

/** File bytes stay in Node and regional storage, never an action result. */
export const file = internalAction({
  args: {
    path: v.string(),
    name: v.string(),
    mimeType: v.string(),
    runId: v.id("runs"),
  },
  returns: v.object({
    sandboxId: v.string(),
    file: v.object({
      fileId: v.id("files"),
      mimeType: v.string(),
      name: v.string(),
      size: v.number(),
      url: v.union(v.string(), v.null()),
    }),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{ sandboxId: string; file: UploadedFile }> => {
    const path = sandboxFilePath(args.path)
    const run = await ctx.runQuery(internal.runs.records.get, {
      runId: args.runId,
    })
    if (run === null) {
      throw new Error("Run not found.")
    }
    const retained = await ctx.runMutation(
      internal.runs.execution.sandboxes.records.claimForRun,
      { runId: args.runId }
    )
    if (retained === null) {
      throw new Error("Run has no sandbox to export from.")
    }
    const sandbox = await openSandbox(ctx, {
      runId: args.runId,
      sandboxId: retained.externalId,
    })
    assertFileSize(await regularFileSize(sandbox, path))
    const bytes = await readSandboxFile(sandbox, path)
    assertFileSize(bytes.byteLength)
    const saved = await uploadRunFile(ctx, {
      bytes,
      mimeType: args.mimeType,
      name: args.name,
      organizationId: run.organizationId,
      runId: args.runId,
    })
    return { sandboxId: sandboxName(sandbox), file: saved }
  },
})

/** Check parents as well as the leaf: a parent symlink also escapes the path. */
async function regularFileSize(sandbox: BlaxelSandbox, path: string) {
  let current = ""
  let size = 0
  for (const component of path.split("/").filter(Boolean)) {
    current += `/${component}`
    const info = await sandboxFileInfo(sandbox, current)
    if (info.symlinkTarget !== undefined) {
      throw new Error("Cannot export files through symbolic links.")
    }
    if (info.type !== (current === path ? "file" : "dir")) {
      throw new Error("Export path must point to a regular file.")
    }
    size = info.size
  }
  return size
}

function assertFileSize(size: number) {
  if (size === 0) {
    throw new Error("File is empty")
  }
  if (size > maxFileBytes) {
    throw new Error(fileTooLargeError)
  }
}
