import { v } from "convex/values"
import { playbookCatalog } from "../../contracts/playbooks/catalog"
import { type Doc } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server"
import { checkOrganizationAccess, requireOrganizationAccess } from "../access"
import { requireUserId } from "../access/users"
import { listInactiveAccessIntegrations } from "../automations/access"
import { createAutomation } from "../automations/lifecycle"
import * as automationSchema from "../automations/schema"
import { ensureCurrentPerson } from "../persons/account"
import { resolvePersonByIdentity } from "../persons/identity/links"
import { scopeValidator } from "../shared/audience"
import { type QueryLikeCtx } from "../shared/context"
import { callerRecipient, playbookPlanArgs, playbookPlanFields } from "./caller"
import {
  deliverySetup,
  saveDeliveryPreference as persistDeliveryPreference,
  readDeliveryContext,
} from "./delivery"
import { resolvePlaybookDraft } from "./draft"
import {
  enablePlaybook,
  readPlaybookAutomations,
  reconfigurePlaybook,
  validatePlaybookEnablement,
} from "./enable"
import {
  connectedIntegrations,
  readPlaybookSlots,
  resolvePlaybookPlan,
} from "./plan"
import { deliveryChoiceValidator, playbookBindingValidator } from "./schema"
import { trialPlaybook } from "./trial"

const recipientValidator = v.object({
  email: v.optional(v.string()),
  name: v.optional(v.string()),
})

const resolvedPlanFields = {
  ...playbookPlanFields,
  createdBy: v.id("persons"),
  recipient: recipientValidator,
}

export const list = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        playbooks: [],
      }
    }

    const ownerId = await resolvePersonByIdentity(ctx, {
      organizationId: args.organizationId,
      provider: "auth",
      externalId: requireUserId(access.identity),
    })
    const connected = await connectedIntegrations(ctx, {
      ownerId,
      organizationId: args.organizationId,
    })
    const enabled = await readPlaybookAutomations(ctx, {
      ownerId,
      organizationId: args.organizationId,
    })
    const deliveryContext = await readDeliveryContext(ctx, {
      connected,
      ownerId,
      recipient: callerRecipient(access.identity),
      organizationId: args.organizationId,
    })

    return {
      status: "ready" as const,
      playbooks: await Promise.all(
        playbookCatalog.map(async (definition) => ({
          key: definition.key,
          slots: readPlaybookSlots(definition, connected),
          delivery: deliverySetup(definition, deliveryContext),
          enabled: await enabledProjection(ctx, enabled.get(definition.key)),
        }))
      ),
    }
  },
})

/** The enabled card state: run status plus the stored recipe input, so the
 *  setup dialog can reopen prefilled and detect available updates. */
async function enabledProjection(
  ctx: QueryLikeCtx,
  automation: Doc<"automations"> | undefined
) {
  if (automation === undefined) {
    return null
  }

  return {
    automationId: automation._id,
    status: automation.status,
    nextRunAt:
      "nextAt" in automation.trigger ? automation.trigger.nextAt : undefined,
    missing: await listInactiveAccessIntegrations(ctx, automation.access),
    setup: automation.playbook ?? null,
  }
}

export const saveDeliveryPreference = mutation({
  args: {
    organizationId: v.string(),
    delivery: deliveryChoiceValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const personId = await ensureCurrentPerson(ctx, args.organizationId)
    const connected = await connectedIntegrations(ctx, {
      ownerId: personId,
      organizationId: args.organizationId,
    })

    await persistDeliveryPreference(ctx, {
      connected,
      delivery: args.delivery,
      personId,
      recipient: callerRecipient(identity),
      organizationId: args.organizationId,
    })

    return null
  },
})

export const enableResolved = internalMutation({
  args: resolvedPlanFields,
  returns: v.object({ automationId: v.id("automations") }),
  handler: async (ctx, args) =>
    await enablePlaybook(
      ctx,
      playbookPlanArgs(args, args.createdBy, args.recipient)
    ),
})

export const reconfigureResolved = internalMutation({
  args: {
    ...resolvedPlanFields,
    automationId: v.id("automations"),
  },
  returns: v.object({ automationId: v.id("automations") }),
  handler: async (ctx, args) =>
    await reconfigurePlaybook(ctx, {
      ...playbookPlanArgs(args, args.createdBy, args.recipient),
      automationId: args.automationId,
    }),
})

/** Create the automation an edited playbook draft describes. */
export const createResolved = internalMutation({
  args: {
    organizationId: v.string(),
    playbook: playbookBindingValidator,
    key: v.optional(v.string()),
    name: v.string(),
    instructions: v.string(),
    scope: v.optional(scopeValidator),
    access: automationSchema.accessInput,
    type: automationSchema.automationType,
    trigger: automationSchema.triggerInput,
    createdBy: v.id("persons"),
  },
  returns: v.object({ automationId: v.id("automations") }),
  handler: async (ctx, args) => {
    const automation = await createAutomation(ctx, args)

    return { automationId: automation._id }
  },
})

export const validateResolved = internalQuery({
  args: resolvedPlanFields,
  returns: v.null(),
  handler: async (ctx, args) => {
    await validatePlaybookEnablement(
      ctx,
      playbookPlanArgs(args, args.createdBy, args.recipient)
    )

    return null
  },
})

export const validatePlanResolved = internalQuery({
  args: resolvedPlanFields,
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolvePlaybookPlan(
      ctx,
      playbookPlanArgs(args, args.createdBy, args.recipient)
    )

    return null
  },
})

export const trialResolved = internalMutation({
  args: resolvedPlanFields,
  returns: v.object({ runId: v.id("runs") }),
  handler: async (ctx, args) =>
    await trialPlaybook(
      ctx,
      playbookPlanArgs(args, args.createdBy, args.recipient)
    ),
})

export const draftResolved = internalQuery({
  args: resolvedPlanFields,
  handler: async (ctx, args) =>
    await resolvePlaybookDraft(
      ctx,
      playbookPlanArgs(args, args.createdBy, args.recipient)
    ),
})
