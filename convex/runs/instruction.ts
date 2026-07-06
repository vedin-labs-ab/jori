import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { queueRun } from "../runtime/outbox"
import { type Access } from "../shared/integrations"
import { resolveRunAudience } from "./introspect/audience"
import { createInstructionRunSnapshot } from "./snapshot"

/**
 * A manual run from bare instructions — no automation behind it. `access`
 * narrows the run to an explicit tool contract; omitted, the run gets the
 * caller's full tool surface.
 */
export async function createInstructionRun(
  ctx: MutationCtx,
  args: {
    tenantId: string
    instructions: string
    title?: string
    access?: Access
    parent?: Doc<"runs">
    createdBy?: Id<"persons">
  }
) {
  const parent = args.parent

  const runId = await ctx.db.insert("runs", {
    tenantId: args.tenantId,
    ...(parent === undefined
      ? {}
      : { parentId: parent._id, rootId: parent.rootId ?? parent._id }),
    cause: { type: "manual", personId: args.createdBy },
    access: args.access,
    ...createInstructionRunSnapshot({
      instructions: args.instructions,
      parent,
      title: args.title,
    }),
    ...(await resolveRunAudience(ctx, {
      run: { createdBy: args.createdBy, parentId: parent?._id },
    })),
    status: "queued",
    createdBy: args.createdBy,
    createdAt: Date.now(),
  })

  await queueRun(ctx, runId)

  return runId
}
