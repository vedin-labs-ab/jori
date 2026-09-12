"use node"

import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx, internalAction } from "../../_generated/server"
import {
  type BlaxelSandbox,
  cloneIntoSandbox,
  collectCommandOutput,
  connectSandbox,
  createSandbox,
  defaultCommandTimeoutMs,
  killSandbox,
  normalizeCommandResult,
  readSandboxFile,
  runSandboxCommand,
  sandboxCleanupFailure,
  sandboxName,
  startSandboxCommand,
  waitForCommand,
  writeSandboxFiles,
} from "./blaxel/client"
import { commandWrapperScript } from "./script"

/** How long a command may hold its action open before the run parks on it.
 *  Most tool commands finish well inside this. */
const commandGraceMs = 120_000

const sandboxTarget = {
  runId: v.id("runs"),
  sandboxId: v.union(v.string(), v.null()),
}
const commandInput = v.object({
  command: v.string(),
  cwd: v.optional(v.string()),
  timeoutMs: v.optional(v.number()),
})
const commandResult = v.object({
  exitCode: v.number(),
  stderr: v.string(),
  stdout: v.string(),
  timedOut: v.optional(v.literal(true)),
})
const commandHandle = v.object({ pid: v.string(), token: v.string() })

export const command = internalAction({
  args: { ...sandboxTarget, input: commandInput },
  returns: v.object({ result: commandResult, sandboxId: v.string() }),
  handler: async (ctx, args) => {
    const sandbox = await openSandbox(ctx, args)
    const result = await runSandboxCommand(sandbox, args.input)

    return {
      result: normalizeCommandResult(result),
      sandboxId: sandboxName(sandbox),
    }
  },
})

export const start = internalAction({
  args: { ...sandboxTarget, input: commandInput, token: v.string() },
  returns: v.union(
    v.object({ result: commandResult, sandboxId: v.string() }),
    v.object({ handle: commandHandle, sandboxId: v.string() })
  ),
  handler: async (ctx, args) => {
    const sandbox = await openSandbox(ctx, args)
    const timeoutMs = args.input.timeoutMs ?? defaultCommandTimeoutMs
    const sandboxId = sandboxName(sandbox)

    const handle = await startSandboxCommand(sandbox, {
      command: commandWrapperScript({
        callbackUrl: commandCallbackUrl(),
        command: args.input.command,
        token: args.token,
      }),
      cwd: args.input.cwd,
      timeoutMs,
    })

    if (!(await waitForCommand(sandbox, handle.pid, commandGraceMs))) {
      return { handle: { pid: handle.pid, token: args.token }, sandboxId }
    }

    return {
      result: await collectCommandOutput(sandbox, args.token),
      sandboxId,
    }
  },
})

export const finish = internalAction({
  args: { ...sandboxTarget, handle: commandHandle, kill: v.boolean() },
  returns: v.object({ result: commandResult, sandboxId: v.string() }),
  handler: async (ctx, args) => {
    const sandbox = await openSandbox(ctx, args)

    if (args.kill) {
      await sandbox.process.kill(args.handle.pid)
    }

    return {
      result: await collectCommandOutput(sandbox, args.handle.token),
      sandboxId: sandboxName(sandbox),
    }
  },
})

export const read = internalAction({
  args: { ...sandboxTarget, path: v.string() },
  returns: v.object({ content: v.bytes(), sandboxId: v.string() }),
  handler: async (ctx, args) => {
    const sandbox = await openSandbox(ctx, args)
    const content = await readSandboxFile(sandbox, args.path)

    return {
      content: new Uint8Array(content).buffer,
      sandboxId: sandboxName(sandbox),
    }
  },
})

export const write = internalAction({
  args: {
    ...sandboxTarget,
    files: v.array(
      v.object({ content: v.union(v.string(), v.bytes()), path: v.string() })
    ),
  },
  returns: v.object({ sandboxId: v.string() }),
  handler: async (ctx, args) => {
    const sandbox = await openSandbox(ctx, args)

    await writeSandboxFiles(
      sandbox,
      args.files.map((file) => ({
        path: file.path,
        content:
          typeof file.content === "string"
            ? file.content
            : new Uint8Array(file.content),
      }))
    )

    return { sandboxId: sandboxName(sandbox) }
  },
})

export const clone = internalAction({
  args: {
    ...sandboxTarget,
    input: v.object({
      directory: v.optional(v.union(v.string(), v.null())),
      ref: v.optional(v.string()),
      remoteUrl: v.string(),
      repository: v.string(),
      token: v.string(),
      username: v.string(),
    }),
  },
  returns: v.object({
    result: v.object({
      directory: v.string(),
      git: v.literal(true),
      ref: v.optional(v.string()),
      remoteUrl: v.string(),
      repository: v.string(),
    }),
    sandboxId: v.string(),
  }),
  handler: async (ctx, args) => {
    const sandbox = await openSandbox(ctx, args)

    return {
      result: await cloneIntoSandbox(sandbox, args.input),
      sandboxId: sandboxName(sandbox),
    }
  },
})

export const kill = internalAction({
  args: {
    expiresAt: v.optional(v.number()),
    externalId: v.string(),
    runId: v.id("runs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!(await reserveCleanup(ctx, args))) {
      return null
    }

    try {
      await killSandbox(args.externalId)
    } catch {
      await ctx.runMutation(internal.runs.execution.sandboxes.records.cleaned, {
        externalId: args.externalId,
        error: sandboxCleanupFailure,
      })
      throw new Error(sandboxCleanupFailure)
    }
    await ctx.runMutation(internal.runs.execution.sandboxes.records.cleaned, {
      externalId: args.externalId,
    })

    return null
  },
})

/** An expiry identifies the idle lease. Cleanup watchdogs and completed runs
 * reserve without one, but still check ownership and the cleanup lease. */
async function reserveCleanup(
  ctx: ActionCtx,
  args: { expiresAt?: number; externalId: string; runId: Id<"runs"> }
) {
  return await ctx.runMutation(
    internal.runs.execution.sandboxes.records.reserve,
    {
      ...(args.expiresAt === undefined ? {} : { expiresAt: args.expiresAt }),
      externalId: args.externalId,
      runId: args.runId,
    }
  )
}

/** The actions are stateless, so each one either reconnects to the sandbox the
 *  caller names or creates the run's first and records it. */
export async function openSandbox(
  ctx: ActionCtx,
  args: { runId: Id<"runs">; sandboxId: string | null }
): Promise<BlaxelSandbox> {
  const allowed = await ctx.runQuery(internal.jobs.records.canExecuteRunTools, {
    runId: args.runId,
  })

  if (!allowed) {
    throw new Error("This run is no longer active.")
  }

  if (args.sandboxId !== null) {
    return await connectSandbox(args.sandboxId)
  }

  const sandbox = await createSandbox()

  try {
    const accepted = await ctx.runMutation(
      internal.runs.execution.sandboxes.records.upsert,
      { externalId: sandboxName(sandbox), runId: args.runId }
    )
    if (!accepted) {
      throw new Error("This run is no longer active.")
    }
    return sandbox
  } catch (error) {
    // Creation can finish after deletion removes the run. This sandbox has
    // no durable owner, so the creating action must dispose of it.
    await killSandbox(sandboxName(sandbox))
    throw error
  }
}

function commandCallbackUrl() {
  const site = process.env.CONVEX_SITE_URL?.trim()

  if (site === undefined || site === "") {
    throw new Error("Missing CONVEX_SITE_URL")
  }

  return `${site}/jori/commands`
}
