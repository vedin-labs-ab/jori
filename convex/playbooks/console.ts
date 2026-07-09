import { v } from "convex/values"
import { playbookCatalog } from "../../contracts/playbooks/catalog"
import { type DeliveryChoice } from "../../contracts/playbooks/delivery"
import { type MutationCtx, mutation, query } from "../_generated/server"
import { checkTenantAccess, requireTenantAccess } from "../identity/access"
import {
  readClerkUserEmail,
  readClerkUserName,
  requireClerkUserId,
} from "../identity/users"
import { ensureClerkPerson, resolveCurrentPerson } from "../persons/clerk"
import { resolvePersonByIdentity } from "../persons/links"
import { type Integration, integrationValidator } from "../shared/integrations"
import { resolvePlaybookDraft } from "./draft"
import {
  availableDelivery,
  connectedIntegrations,
  enablePlaybook,
  type PlaybookPlanArgs,
  readPlaybookAutomations,
  readPlaybookSlots,
} from "./enable"
import { trialPlaybook } from "./trial"

// The validator mirrors DeliveryChoice; resolveCallerPlanArgs assigns the
// inferred args into that type, so drift is a compile error there.
const destinationValidator = v.union(
  v.object({ kind: v.literal("email") }),
  v.object({
    kind: v.literal("slack"),
    channelId: v.string(),
    channelName: v.string(),
  })
)

const planArgs = {
  tenantId: v.string(),
  playbook: v.string(),
  // Keyed by playbook capability; slot resolution ignores unknown keys.
  choices: v.optional(v.record(v.string(), integrationValidator)),
  destination: v.optional(destinationValidator),
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
      playbooks: playbookCatalog.map((definition) => {
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
                },
        }
      }),
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

// A non-persisting preview of the automation a playbook would create, for the
// raw builder. Read-only, so it resolves the caller's existing person.
export const draft = query({
  args: {
    ...planArgs,
    utcOffsetMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const createdBy = await resolveCurrentPerson(ctx, args.tenantId)

    return await resolvePlaybookDraft(ctx, {
      ...planFromArgs(args, createdBy, callerRecipient(identity)),
      utcOffsetMinutes: args.utcOffsetMinutes,
    })
  },
})

async function resolveCallerPlanArgs(
  ctx: MutationCtx,
  identity: { email?: string; name?: string; subject?: string },
  args: {
    tenantId: string
    playbook: string
    choices?: Record<string, Integration>
    destination?: DeliveryChoice
  }
): Promise<PlaybookPlanArgs> {
  const recipient = callerRecipient(identity)
  const createdBy = await ensureClerkPerson(ctx, {
    tenantId: args.tenantId,
    clerkSubject: requireClerkUserId(identity),
    email: recipient.email,
    name: recipient.name,
  })

  return planFromArgs(args, createdBy, recipient)
}

function planFromArgs(
  args: {
    tenantId: string
    playbook: string
    choices?: Record<string, Integration>
    destination?: DeliveryChoice
  },
  createdBy: PlaybookPlanArgs["createdBy"],
  recipient: PlaybookPlanArgs["recipient"]
): PlaybookPlanArgs {
  return {
    tenantId: args.tenantId,
    key: args.playbook,
    choices: args.choices ?? {},
    destination: args.destination ?? { kind: "email" },
    createdBy,
    recipient,
  }
}

function callerRecipient(identity: {
  email?: string
  name?: string
}): PlaybookPlanArgs["recipient"] {
  const email = readClerkUserEmail(identity)

  if (email === undefined) {
    throw new Error(
      "Your account needs an email address before playbooks can email you."
    )
  }

  return { email, name: readClerkUserName(identity) }
}
