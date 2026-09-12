import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { requireRunBudget } from "../billing/guard"
import { assertWorkspaceAvailable } from "../retention/access"
import { type Access } from "../shared/integrations"
import { resolveRunAudience } from "./audience"
import { startRun } from "./execution/workflow"
import {
  type ExecutionPrincipal,
  executionPrincipalForPerson,
} from "./principal"
import { createInstructionRunSnapshot } from "./snapshot"

/**
 * A manual run from bare instructions — no job behind it. `access`
 * narrows the run to an explicit tool contract; omitted, the run gets the
 * caller's full tool surface.
 */
export async function createInstructionRun(
  ctx: MutationCtx,
  args: {
    organizationId: string
    instructions: string
    title?: string
    access?: Access
    parent?: Doc<"runs">
    createdBy?: Id<"persons">
    principal?: ExecutionPrincipal
  }
) {
  await assertWorkspaceAvailable(ctx, args.organizationId)
  const parent = args.parent
  const conversation =
    parent?.conversationId === undefined
      ? null
      : await ctx.db.get(parent.conversationId)
  const folderId =
    conversation === null ? parent?.folderId : conversation.folderId

  // Child runs ride on their parent's budget; only fresh work is gated.
  if (parent === undefined) {
    await requireRunBudget(ctx, {
      organizationId: args.organizationId,
      interactive: true,
    })
  }

  const runId = await ctx.db.insert("runs", {
    organizationId: args.organizationId,
    ...(parent === undefined
      ? {}
      : {
          parentId: parent._id,
          rootId: parent.rootId ?? parent._id,
          ...(parent.job === undefined ? {} : { job: parent.job }),
          ...(folderId === undefined ? {} : { folderId }),
        }),
    cause: { type: "manual", personId: args.createdBy },
    principal:
      args.principal ??
      parent?.principal ??
      executionPrincipalForPerson(args.createdBy),
    access: args.access,
    ...createInstructionRunSnapshot({
      instructions: args.instructions,
      title: args.title,
    }),
    ...(await resolveRunAudience(ctx, {
      run: { createdBy: args.createdBy, parentId: parent?._id },
    })),
    status: "queued",
    createdBy: args.createdBy,
    createdAt: Date.now(),
  })

  await startRun(ctx, runId)

  return runId
}
