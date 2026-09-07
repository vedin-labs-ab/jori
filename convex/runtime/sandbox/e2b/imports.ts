"use node"

import { v } from "convex/values"
import {
  fileTooLargeError,
  maxFileBytes,
} from "../../../../contracts/runtime/files"
import { internal } from "../../../_generated/api"
import { internalAction } from "../../../_generated/server"
import { openSandbox } from "../e2b"
import { sandboxFilePath } from "../path"

/** Keep large bytes in storage, never in a Convex action argument or result. */
export const file = internalAction({
  args: {
    fileId: v.id("files"),
    path: v.string(),
    runId: v.id("runs"),
  },
  returns: v.object({ sandboxId: v.string() }),
  handler: async (ctx, args): Promise<{ sandboxId: string }> => {
    const path = sandboxFilePath(args.path)
    const source = await ctx.runQuery(internal.files.data.forRun, {
      fileId: args.fileId,
      runId: args.runId,
    })
    if (source.size > maxFileBytes) {
      throw new Error(fileTooLargeError)
    }
    // storage.get resolves only this deployment's blob ID. No URL is accepted,
    // minted, exposed to E2B, or followed by this transfer.
    const blob = await ctx.storage.get(source.storageId)
    if (blob === null) {
      throw new Error("Stored file was not found.")
    }
    if (blob.size > maxFileBytes) {
      throw new Error(fileTooLargeError)
    }
    const retained = await ctx.runMutation(
      internal.runs.execution.sandboxes.records.claimForRun,
      { runId: args.runId }
    )
    const sandbox = await openSandbox(ctx, {
      runId: args.runId,
      sandboxId: retained?.externalId ?? null,
    })
    await sandbox.files.write(path, await blob.arrayBuffer())
    return { sandboxId: sandbox.sandboxId }
  },
})
