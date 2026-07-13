import { v } from "convex/values"
import { playbookCatalog } from "../../contracts/playbooks/catalog"
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server"
import { listInactiveAccessIntegrations } from "../automations/access"
import { checkTenantAccess, requireTenantAccess } from "../identity/access"
import { requireClerkUserId } from "../identity/users"
import { ensureCurrentPerson } from "../persons/clerk"
import { resolvePersonByIdentity } from "../persons/links"
import { callerRecipient, playbookPlanArgs, playbookPlanFields } from "./caller"
import {
  deliverySetup,
  saveDeliveryPreference as persistDeliveryPreference,
  readDeliveryContext,
} from "./delivery"
import { resolvePlaybookDraft } from "./draft"
import {
  connectedIntegrations,
  enablePlaybook,
  readPlaybookAutomations,
  readPlaybookSlots,
  resolvePlaybookPlan,
  validatePlaybookEnablement,
} from "./enable"
import { deliveryChoiceValidator } from "./schema"
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

const resolvedArtifactPlanFields = {
  ...resolvedPlanFields,
  artifactId: v.optional(v.id("artifacts")),
}

export const list = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        playbooks: [],
      }
    }

    const ownerId = await resolvePersonByIdentity(ctx, {
      tenantId: args.tenantId,
      provider: "clerk",
      externalId: requireClerkUserId(access.identity),
    })
    const connected = await connectedIntegrations(ctx, {
      ownerId,
      tenantId: args.tenantId,
    })
    const enabled = await readPlaybookAutomations(ctx, {
      ownerId,
      tenantId: args.tenantId,
    })
    const deliveryContext = await readDeliveryContext(ctx, {
      connected,
      ownerId,
      recipient: callerRecipient(access.identity),
      tenantId: args.tenantId,
    })

    return {
      status: "ready" as const,
      playbooks: await Promise.all(
        playbookCatalog.map(async (definition) => {
          const automation = enabled.get(definition.key)

          return {
            key: definition.key,
            slots: readPlaybookSlots(definition, connected),
            delivery: deliverySetup(definition, deliveryContext),
            enabled:
              automation === undefined
                ? null
                : {
                    automationId: automation._id,
                    status: automation.status,
                    nextRunAt:
                      "nextAt" in automation.trigger
                        ? automation.trigger.nextAt
                        : undefined,
                    missing: await listInactiveAccessIntegrations(
                      ctx,
                      automation.access
                    ),
                  },
          }
        })
      ),
    }
  },
})

export const saveDeliveryPreference = mutation({
  args: {
    tenantId: v.string(),
    delivery: deliveryChoiceValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const personId = await ensureCurrentPerson(ctx, args.tenantId)
    const connected = await connectedIntegrations(ctx, {
      ownerId: personId,
      tenantId: args.tenantId,
    })

    await persistDeliveryPreference(ctx, {
      connected,
      delivery: args.delivery,
      personId,
      recipient: callerRecipient(identity),
      tenantId: args.tenantId,
    })

    return null
  },
})

export const enableResolved = internalMutation({
  args: {
    ...playbookPlanFields,
    createdBy: v.id("persons"),
    recipient: recipientValidator,
    artifactId: v.optional(v.id("artifacts")),
  },
  returns: v.object({ automationId: v.id("automations") }),
  handler: async (ctx, args) =>
    await enablePlaybook(
      ctx,
      playbookPlanArgs(args, args.createdBy, args.recipient, args.artifactId)
    ),
})

export const validateResolved = internalQuery({
  args: {
    ...playbookPlanFields,
    createdBy: v.id("persons"),
    recipient: recipientValidator,
  },
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
  args: resolvedArtifactPlanFields,
  returns: v.object({ runId: v.id("runs") }),
  handler: async (ctx, args) =>
    await trialPlaybook(
      ctx,
      playbookPlanArgs(args, args.createdBy, args.recipient, args.artifactId)
    ),
})

export const draftResolved = internalQuery({
  args: resolvedArtifactPlanFields,
  handler: async (ctx, args) =>
    await resolvePlaybookDraft(
      ctx,
      playbookPlanArgs(args, args.createdBy, args.recipient, args.artifactId)
    ),
})
