import { v } from "convex/values"
import { playbookCatalog } from "../../contracts/playbooks/catalog"
import { type MutationCtx, mutation, query } from "../_generated/server"
import { checkTenantAccess, requireTenantAccess } from "../identity/access"
import {
  readClerkUserEmail,
  readClerkUserName,
  requireClerkUserId,
} from "../identity/users"
import { ensureClerkPerson } from "../persons/clerk"
import { resolvePersonByIdentity } from "../persons/links"
import { type Integration, integrationValidator } from "../shared/integrations"
import {
  enablePlaybook,
  type PlaybookPlanArgs,
  readPlaybookAutomations,
  readPlaybookSlots,
} from "./enable"
import { trialPlaybook } from "./trial"

const planArgs = {
  tenantId: v.string(),
  playbook: v.string(),
  // Keyed by playbook capability; slot resolution ignores unknown keys.
  choices: v.optional(v.record(v.string(), integrationValidator)),
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
    const enabled = await readPlaybookAutomations(ctx, args.tenantId)

    return {
      status: "ready" as const,
      playbooks: await Promise.all(
        playbookCatalog.map(async (definition) => {
          const automation = enabled.get(definition.key)

          return {
            key: definition.key,
            slots: await readPlaybookSlots(ctx, {
              definition,
              ownerId,
              tenantId: args.tenantId,
            }),
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
                  },
          }
        })
      ),
    }
  },
})

export const enable = mutation({
  args: {
    ...planArgs,
    utcOffsetMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const plan = await resolveCallerPlanArgs(ctx, identity, args)

    return await enablePlaybook(ctx, {
      ...plan,
      utcOffsetMinutes: args.utcOffsetMinutes,
    })
  },
})

export const trial = mutation({
  args: planArgs,
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)

    return await trialPlaybook(
      ctx,
      await resolveCallerPlanArgs(ctx, identity, args)
    )
  },
})

async function resolveCallerPlanArgs(
  ctx: MutationCtx,
  identity: { email?: string; name?: string; subject?: string },
  args: {
    tenantId: string
    playbook: string
    choices?: Record<string, Integration>
  }
): Promise<PlaybookPlanArgs> {
  const email = readClerkUserEmail(identity)

  if (email === undefined) {
    throw new Error(
      "Your account needs an email address before playbooks can email you."
    )
  }

  const name = readClerkUserName(identity)
  const createdBy = await ensureClerkPerson(ctx, {
    tenantId: args.tenantId,
    clerkSubject: requireClerkUserId(identity),
    email,
    name,
  })

  return {
    tenantId: args.tenantId,
    key: args.playbook,
    choices: args.choices ?? {},
    createdBy,
    recipient: { email, name },
  }
}
