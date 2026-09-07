"use node"

import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx, internalAction } from "../../_generated/server"
import { commandWrapperScript } from "./script"
import {
  cloneIntoSandbox,
  collectCommandOutput,
  connectSandbox,
  createSandbox,
  defaultCommandTimeoutMs,
  type E2BSandbox,
  killSandbox,
  normalizeCommandResult,
  runSandboxCommand,
  sandboxCleanupFailure,
  waitForCommand,
} from "./support"

/** How long a command may hold its action open before the run parks on it.
 *  Most tool commands finish well inside this. */
const commandGraceMs = 120_000
/** Room for the callback and the collection after the command's own deadline,
 *  so the sandbox does not pause with the output still unread. */
const sandboxHeadroomMs = 5 * 60 * 1000

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
const commandHandle = v.object({ pid: v.number(), token: v.string() })

export const command = internalAction({
  args: { ...sandboxTarget, input: commandInput },
  returns: v.object({ result: commandResult, sandboxId: v.string() }),
  handler: async (ctx, args) => {
    const sandbox = await openSandbox(ctx, args)
    const result = await runSandboxCommand(sandbox, args.input)

    return {
      result: normalizeCommandResult(result),
      sandboxId: sandbox.sandboxId,
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
    const sandboxId = sandbox.sandboxId

    await sandbox.setTimeout(timeoutMs + sandboxHeadroomMs)

    const handle = await sandbox.commands.run(
      commandWrapperScript({
        callbackUrl: commandCallbackUrl(),
        command: args.input.command,
        token: args.token,
      }),
      { background: true, cwd: args.input.cwd, timeoutMs }
    )

    if (!(await waitForCommand(handle, commandGraceMs))) {
      await handle.disconnect()

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
      await sandbox.commands.kill(args.handle.pid)
    }

    return {
      result: await collectCommandOutput(sandbox, args.handle.token),
      sandboxId: sandbox.sandboxId,
    }
  },
})

export const read = internalAction({
  args: { ...sandboxTarget, path: v.string() },
  returns: v.object({ content: v.bytes(), sandboxId: v.string() }),
  handler: async (ctx, args) => {
    const sandbox = await openSandbox(ctx, args)
    const content = await sandbox.files.read(args.path, { format: "bytes" })

    return {
      content: new Uint8Array(content).buffer,
      sandboxId: sandbox.sandboxId,
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

    await sandbox.files.write(
      args.files.map((file) => ({ data: file.content, path: file.path }))
    )

    return { sandboxId: sandbox.sandboxId }
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
      sandboxId: sandbox.sandboxId,
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
): Promise<E2BSandbox> {
  if (args.sandboxId !== null) {
    return await connectSandbox(args.sandboxId)
  }

  const sandbox = await createSandbox(args.runId)

  await ctx.runMutation(internal.runs.execution.sandboxes.records.upsert, {
    externalId: sandbox.sandboxId,
    runId: args.runId,
  })

  return sandbox
}

function commandCallbackUrl() {
  const site = process.env.CONVEX_SITE_URL?.trim()

  if (site === undefined || site === "") {
    throw new Error("Missing CONVEX_SITE_URL")
  }

  return `${site}/jori/commands`
}
