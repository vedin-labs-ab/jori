import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { resolveRunAudience } from "../../runs/audience"
import { queueRun } from "../../runs/execution/outbox/data"
import { createAutomationRunSnapshot } from "../../runs/snapshot"

export async function createAutomationRun(
  ctx: MutationCtx,
  args: {
    automation: Doc<"automations">
    event?: Doc<"events"> | null
    integration?: Doc<"integrations"> | null
    cause: Doc<"runs">["cause"]
    now: number
  }
) {
  const runId = await ctx.db.insert("runs", {
    organizationId: args.automation.organizationId,
    automation: {
      id: args.automation._id,
      parentId: args.automation.parent?.id,
      version:
        args.automation.parent === undefined
          ? (args.automation.version ?? 1)
          : (args.automation.parent.version ?? 0),
    },
    cause: args.cause,
    principal: args.automation.principal,
    ...createAutomationRunSnapshot(args),
    ...(await resolveRunAudience(ctx, {
      origin: { automation: args.automation },
      run: { createdBy: args.automation.createdBy },
    })),
    status: "queued",
    createdBy: args.automation.createdBy,
    // Attribution is stamped once, here: what the run costs answers to the
    // folder the automation was filed in when it fired, whatever happens to
    // the filing later.
    folderId: args.automation.folderId,
    createdAt: args.now,
  })

  await ctx.db.patch(args.automation._id, {
    firedAt: args.now,
    updatedAt: args.now,
  })
  await queueRun(ctx, runId)

  return runId
}
