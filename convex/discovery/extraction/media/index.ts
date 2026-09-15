"use node"

import { internal } from "../../../_generated/api"
import { type Id } from "../../../_generated/dataModel"
import { type ActionCtx } from "../../../_generated/server"
import {
  createSandbox,
  killSandbox,
  readSandboxFile,
  runSandboxCommand,
  sandboxName,
  writeSandboxFiles,
} from "../../../runtime/sandbox/blaxel/client"
import { remove } from "../cleanup"
import { CoverageError } from "../types"
import { recognitionScript } from "./recognition"
import { readResult } from "./response"
import { transcriptionScript } from "./transcription"

export async function extractMedia(
  ctx: ActionCtx,
  source: { sourceKey: string; revision: string; organizationId: string },
  bytes: Uint8Array,
  kind: "image" | "pdf" | "audio" | "doc",
  pages: number[] = []
) {
  const image = process.env.JORI_DISCOVERY_BLAXEL_IMAGE
  if (!image) {
    throw new CoverageError(
      "failed",
      "The regional extraction image is not configured."
    )
  }
  const sandbox = await createSandbox(image, "10m")
  const externalId = sandboxName(sandbox)
  let id: Id<"discoverySandboxes"> | null = null
  try {
    id = await ctx.runMutation(internal.discovery.extraction.records.register, {
      ...source,
      externalId,
    })
    if (id === null) {
      throw new CoverageError("failed", "This workspace is being deleted.")
    }
    // Registration precedes the first customer byte; filenames and text never
    // enter command lines or provider metadata. All models are baked into image.
    await writeSandboxFiles(sandbox, [
      { path: "/home/user/workspace/input", content: bytes },
      {
        path: "/home/user/workspace/extract.py",
        content: kind === "audio" ? transcriptionScript : recognitionScript,
      },
      {
        path: "/home/user/workspace/pages.json",
        content: JSON.stringify(pages),
      },
    ])
    await runSandboxCommand(sandbox, {
      command: `python extract.py ${kind}`,
      cwd: "/home/user/workspace",
      timeoutMs: kind === "audio" ? 420_000 : 180_000,
    })
    const result = await readSandboxFile(
      sandbox,
      `/home/user/workspace/${kind === "audio" ? "transcript" : "recognition"}.json`
    )
    if (result.length > 12_000_000) {
      throw new CoverageError(
        "too_large",
        "Extracted content exceeds the processing limit."
      )
    }
    return readResult(
      new TextDecoder("utf-8", { fatal: true }).decode(result),
      kind
    )
  } finally {
    if (id === null) {
      await killSandbox(externalId)
    } else {
      await remove(ctx, { _id: id, externalId })
    }
  }
}
