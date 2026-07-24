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
    automationId: args.automation._id,
    automationParentId: args.automation.parentId,
    automationConfigurationVersion:
      args.automation.parentId === undefined
        ? (args.automation.configurationVersion ?? 1)
        : (args.automation.parentConfigurationVersion ?? 0),
    appId: args.automation.appId,
    cause: args.cause,
    principal: args.automation.principal,
    ...createAutomationRunSnapshot(args),
    ...(await resolveRunAudience(ctx, {
      origin: { automation: args.automation },
      run: { createdBy: args.automation.createdBy },
    })),
    status: "queued",
    createdBy: args.automation.createdBy,
    createdAt: args.now,
  })

  await ctx.db.patch(args.automation._id, {
    firedAt: args.now,
    updatedAt: args.now,
  })
  await queueRun(ctx, runId)

  return runId
}
