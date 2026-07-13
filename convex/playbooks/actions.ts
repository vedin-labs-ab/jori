"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx, action } from "../_generated/server"
import { requireTenantAccess } from "../access"
import { ensureCurrentPersonFromAction } from "../persons/clerk"
import { provisionPlaybookArtifact } from "./blueprints/provision"
import {
  callerRecipient,
  type PlaybookCallerArgs,
  playbookPlanFields,
} from "./caller"
import { type resolvePlaybookDraft } from "./draft"

export const enable = action({
  args: playbookPlanFields,
  returns: v.object({ automationId: v.id("automations") }),
  handler: async (ctx, args): Promise<{ automationId: Id<"automations"> }> => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const resolved = await resolveAction(ctx, args, identity, true)

    return await ctx.runMutation(internal.playbooks.console.enableResolved, {
      ...args,
      ...resolved,
    })
  },
})

export const trial = action({
  args: playbookPlanFields,
  returns: v.object({ runId: v.id("runs") }),
  handler: async (ctx, args): Promise<{ runId: Id<"runs"> }> => {
    const identity = await requireTenantAccess(ctx, args.tenantId)

    return await ctx.runMutation(internal.playbooks.console.trialResolved, {
      ...args,
      ...(await resolveAction(ctx, args, identity, false)),
    })
  },
})

export const draft = action({
  args: playbookPlanFields,
  handler: async (
    ctx,
    args
  ): Promise<Awaited<ReturnType<typeof resolvePlaybookDraft>>> => {
    const identity = await requireTenantAccess(ctx, args.tenantId)

    return await ctx.runQuery(internal.playbooks.console.draftResolved, {
      ...args,
      ...(await resolveAction(ctx, args, identity, false)),
    })
  },
})

async function resolveAction(
  ctx: ActionCtx,
  args: PlaybookCallerArgs,
  identity: Awaited<ReturnType<typeof requireTenantAccess>>,
  enablement: boolean
) {
  const createdBy = await ensureCurrentPersonFromAction(ctx, args.tenantId)
  const recipient = callerRecipient(identity)
  const validation = enablement
    ? internal.playbooks.console.validateResolved
    : internal.playbooks.console.validatePlanResolved

  await ctx.runQuery(validation, { ...args, createdBy, recipient })

  return {
    createdBy,
    recipient,
    artifactId: await provisionPlaybookArtifact(ctx, {
      key: args.playbook,
      tenantId: args.tenantId,
      personId: createdBy,
    }),
  }
}
