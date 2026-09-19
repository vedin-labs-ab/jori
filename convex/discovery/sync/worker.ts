import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx, internalAction } from "../../_generated/server"
import { prune, refresh, remove, upsert } from "../provider"
import { lane } from "../schema"
import { type Projection } from "../source/types"
import { type Prepared, prepare } from "./prepare"
export const run = internalAction({
  args: { organizationId: v.string(), lane, lease: v.number() },
  handler: async (ctx, args) => {
    try {
      const states: Doc<"discoverySources">[] = await ctx.runQuery(
        internal.discovery.sync.state.batch,
        args
      )
      const prepared = await prepareBatch(ctx, args.organizationId, states)
      await publish(ctx, args.organizationId, prepared)
    } finally {
      await ctx.runMutation(internal.discovery.sync.queue.release, args)
    }
  },
})
async function complete(ctx: ActionCtx, item: Prepared) {
  const { state, source, sections } = item
  if (source?.file && !item.reuse) {
    for (let start = 0; start < sections.length; start += 50) {
      await ctx.runMutation(internal.discovery.sync.passages.store, {
        organizationId: state.organizationId,
        key: state.key,
        generation: state.generation,
        start,
        sections: sections.slice(start, start + 50),
      })
    }
  }
  if (source?.file || !source) {
    while (
      await ctx.runMutation(internal.discovery.sync.passages.prune, {
        key: state.key,
        generation: state.generation,
        parts: sections.length,
      })
    ) {}
  }
  await ctx.runMutation(internal.discovery.sync.state.finish, {
    key: state.key,
    generation: state.generation,
    parts: sections.length,
    ...(source
      ? {
          revision: source.revision,
          resourceKey: source.resourceKey,
          authorityKey: source.authorityKey,
          textHash: item.textHash,
          fileKey: item.fileKey,
          coverage: item.coverage,
          expiresAt: source.expiresAt,
        }
      : {}),
  })
  if (item.coverage === "failed" || item.retryable) {
    await ctx.runMutation(internal.discovery.sync.state.failed, {
      key: state.key,
      generation: state.generation,
    })
  }
}

async function prepareBatch(
  ctx: ActionCtx,
  organizationId: string,
  states: Doc<"discoverySources">[]
) {
  const prepared: Prepared[] = []
  for (let i = 0; i < states.length; i += 8) {
    const projections: Array<{
      key: string
      source: Projection | null
      failed: boolean
    }> = await ctx.runQuery(internal.discovery.sync.state.read, {
      organizationId,
      keys: states.slice(i, i + 8).map((s) => s.key),
    })
    for (const item of projections) {
      const state = states.find((s) => s.key === item.key)
      if (!state) {
        continue
      }
      try {
        if (item.failed) {
          throw new Error("Projection failed")
        }
        const next = await prepare(ctx, state, item.source)
        if (
          await ctx.runMutation(internal.discovery.sync.state.publishing, {
            key: state.key,
            generation: state.generation,
          })
        ) {
          prepared.push(next)
        }
      } catch {
        await failed(ctx, state)
      }
    }
  }
  return prepared
}
async function publish(
  ctx: ActionCtx,
  organizationId: string,
  prepared: Prepared[]
) {
  try {
    await remove(
      organizationId,
      prepared.filter((p) => !p.source).map((p) => p.state.key)
    )
    await upsert(
      organizationId,
      prepared.flatMap((p) => p.rows)
    )
    for (const item of prepared) {
      if (item.source && !item.reuse) {
        await prune(organizationId, item.state.key, item.rows)
      }
      if (
        item.reuse &&
        item.source &&
        item.source.revision !== item.state.revision
      ) {
        await refresh(
          organizationId,
          item.state.key,
          item.source.revision,
          item.source.gate
        )
      }
      await complete(ctx, item)
    }
  } catch {
    for (const item of prepared) {
      await failed(ctx, item.state)
    }
  }
}
function failed(ctx: ActionCtx, state: Doc<"discoverySources">) {
  return ctx.runMutation(internal.discovery.sync.state.failed, {
    key: state.key,
    generation: state.generation,
  })
}
