"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx, action } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import {
  accessInput,
  automationType,
  triggerInput,
} from "../automations/schema"
import { ensureCurrentPersonFromAction } from "../persons/account"
import { scopeValidator } from "../shared/audience"
import {
  callerRecipient,
  type PlaybookCallerArgs,
  playbookPlanFields,
} from "./caller"
import { type resolvePlaybookDraft } from "./draft"
import { playbookBindingValidator } from "./schema"

export const enable = action({
  args: playbookPlanFields,
  returns: v.object({ automationId: v.id("automations") }),
  handler: async (ctx, args): Promise<{ automationId: Id<"automations"> }> => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const caller = await resolveCaller(ctx, args, identity, true)

    return await ctx.runMutation(internal.playbooks.console.enableResolved, {
      ...args,
      ...caller,
    })
  },
})

export const trial = action({
  args: playbookPlanFields,
  returns: v.object({ runId: v.id("runs") }),
  handler: async (ctx, args): Promise<{ runId: Id<"runs"> }> => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const caller = await resolveCaller(ctx, args, identity, false)

    return await ctx.runMutation(internal.playbooks.console.trialResolved, {
      ...args,
      ...caller,
    })
  },
})

/** Re-render an enabled playbook from new options or a newer catalog
 *  version, applying the result to its automation in place. */
export const reconfigure = action({
  args: {
    ...playbookPlanFields,
    automationId: v.id("automations"),
  },
  returns: v.object({ automationId: v.id("automations") }),
  handler: async (ctx, args): Promise<{ automationId: Id<"automations"> }> => {
    const { automationId, ...plan } = args
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const caller = await resolveCaller(ctx, plan, identity, false)

    return await ctx.runMutation(
      internal.playbooks.console.reconfigureResolved,
      {
        ...plan,
        ...caller,
        automationId,
      }
    )
  },
})

/** Render the playbook as an automation draft — nothing persists unless
 *  the draft is actually created. */
export const draft = action({
  args: playbookPlanFields,
  handler: async (
    ctx,
    args
  ): Promise<Awaited<ReturnType<typeof resolvePlaybookDraft>>> => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const caller = await resolveCaller(ctx, args, identity, false)

    return await ctx.runQuery(internal.playbooks.console.draftResolved, {
      ...args,
      ...caller,
    })
  },
})

/** Create an automation from an edited playbook draft (the advanced
 *  builder). */
export const create = action({
  args: {
    organizationId: v.string(),
    playbook: playbookBindingValidator,
    key: v.optional(v.string()),
    name: v.string(),
    instructions: v.string(),
    scope: v.optional(scopeValidator),
    access: accessInput,
    type: automationType,
    trigger: triggerInput,
  },
  returns: v.object({ automationId: v.id("automations") }),
  handler: async (ctx, args): Promise<{ automationId: Id<"automations"> }> => {
    await requireOrganizationAccess(ctx, args.organizationId)

    const createdBy = await ensureCurrentPersonFromAction(
      ctx,
      args.organizationId
    )

    return await ctx.runMutation(internal.playbooks.console.createResolved, {
      ...args,
      createdBy,
    })
  },
})

async function resolveCaller(
  ctx: ActionCtx,
  args: PlaybookCallerArgs,
  identity: Awaited<ReturnType<typeof requireOrganizationAccess>>,
  enablement: boolean
) {
  const createdBy = await ensureCurrentPersonFromAction(
    ctx,
    args.organizationId
  )
  const recipient = callerRecipient(identity)
  const validation = enablement
    ? internal.playbooks.console.validateResolved
    : internal.playbooks.console.validatePlanResolved

  await ctx.runQuery(validation, { ...args, createdBy, recipient })

  return { createdBy, recipient }
}
