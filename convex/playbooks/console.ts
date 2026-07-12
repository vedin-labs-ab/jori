import { v } from "convex/values"
import { playbookCatalog } from "../../contracts/playbooks/catalog"
import { internalMutation, internalQuery, query } from "../_generated/server"
import { listInactiveAccessIntegrations } from "../automations/access"
import { checkTenantAccess } from "../identity/access"
import { requireClerkUserId } from "../identity/users"
import { resolvePersonByIdentity } from "../persons/links"
import { playbookPlanArgs, playbookPlanFields } from "./caller"
import { resolvePlaybookDraft } from "./draft"
import {
  availableDelivery,
  connectedIntegrations,
  enablePlaybook,
  readPlaybookAutomations,
  readPlaybookSlots,
  resolvePlaybookPlan,
  validatePlaybookEnablement,
} from "./enable"
import { trialPlaybook } from "./trial"

const resolvedPlanFields = {
  ...playbookPlanFields,
  createdBy: v.id("persons"),
  recipient: v.object({
    email: v.string(),
    name: v.optional(v.string()),
  }),
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

    return {
      status: "ready" as const,
      playbooks: await Promise.all(
        playbookCatalog.map(async (definition) => {
          const automation = enabled.get(definition.key)

          return {
            key: definition.key,
            slots: readPlaybookSlots(definition, connected),
            delivery: availableDelivery(definition, connected),
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

export const enableResolved = internalMutation({
  args: {
    ...playbookPlanFields,
    createdBy: v.id("persons"),
    recipient: v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }),
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
    recipient: v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }),
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
