import {
  type PlaybookDefinition,
  playbookCatalog,
  resolvePlaybookSchedule,
} from "../../contracts/playbooks/catalog"
import { playbookCron } from "../../contracts/playbooks/schedule"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import {
  createAutomation,
  getOrganizationAutomation,
  updateAutomation,
} from "../automations/lifecycle"
import { requirePersonTimezone } from "../persons/profile/timezone"
import { type QueryLikeCtx } from "../shared/context"
import {
  type PlaybookPlan,
  type PlaybookPlanArgs,
  resolvePlaybookPlan,
} from "./plan"
import { type PlaybookBinding } from "./schema"

export async function enablePlaybook(ctx: MutationCtx, args: PlaybookPlanArgs) {
  const plan = await resolvePlaybookPlan(ctx, args)
  const timezone = await requirePersonTimezone(ctx, args.createdBy)

  await requireNotEnabled(ctx, {
    definition: plan.definition,
    ownerId: args.createdBy,
    organizationId: args.organizationId,
  })

  const automation = await createAutomation(ctx, {
    organizationId: args.organizationId,
    playbook: playbookBinding(plan, args),
    key: `playbook:${plan.definition.key}`,
    name: plan.definition.title,
    instructions: plan.instructions,
    scope: plan.definition.scope,
    access: plan.access,
    type: "cron",
    trigger: playbookTrigger(plan, timezone),
    createdBy: args.createdBy,
    appId: args.appId,
  })

  return { automationId: automation._id }
}

/**
 * Re-render an enabled playbook from new options — or from a newer catalog
 * version — and apply the result to its automation in place. The same
 * operation serves "Edit setup" and "Update": both are deterministic
 * re-renders of the stored recipe input.
 */
export async function reconfigurePlaybook(
  ctx: MutationCtx,
  args: PlaybookPlanArgs & { automationId: Id<"automations"> }
) {
  const plan = await resolvePlaybookPlan(ctx, args)
  const timezone = await requirePersonTimezone(ctx, args.createdBy)
  const automation = await getOrganizationAutomation(
    ctx,
    args.organizationId,
    args.automationId
  )

  if (
    automation.playbook?.key !== plan.definition.key ||
    !matchesPlaybookOwner(automation, args.createdBy)
  ) {
    throw new Error("Playbook automation not found.")
  }

  await updateAutomation(ctx, {
    organizationId: args.organizationId,
    automationId: args.automationId,
    playbook: playbookBinding(plan, args),
    appId: args.appId,
    name: plan.definition.title,
    instructions: plan.instructions,
    access: plan.access,
    type: "cron",
    trigger: playbookTrigger(plan, timezone),
    updatedBy: args.createdBy,
  })

  return { automationId: args.automationId }
}

/** The stored recipe input: replaying it re-renders the same automation. */
export function playbookBinding(
  plan: PlaybookPlan,
  args: Pick<PlaybookPlanArgs, "destination">
): PlaybookBinding {
  return {
    key: plan.definition.key,
    version: plan.definition.version,
    options: plan.options,
    providers: plan.providers,
    destination: args.destination,
  }
}

function playbookTrigger(plan: PlaybookPlan, timezone: string) {
  return {
    expression: playbookCron(
      resolvePlaybookSchedule(plan.definition, plan.options)
    ),
    timezone,
  }
}

export async function validatePlaybookEnablement(
  ctx: QueryLikeCtx,
  args: PlaybookPlanArgs
) {
  const plan = await resolvePlaybookPlan(ctx, args)

  await requirePersonTimezone(ctx, args.createdBy)
  await requireNotEnabled(ctx, {
    definition: plan.definition,
    ownerId: args.createdBy,
    organizationId: args.organizationId,
  })
}

/**
 * Playbook automations relevant to the caller, keyed by playbook key:
 * personal playbooks match only the caller's own enablement, organization
 * playbooks match the organization-wide one.
 */
export async function readPlaybookAutomations(
  ctx: QueryLikeCtx,
  args: { ownerId: Id<"persons"> | undefined; organizationId: string }
) {
  const automations = await ctx.db
    .query("automations")
    .withIndex("by_organization", (index) =>
      index.eq("organizationId", args.organizationId)
    )
    .collect()
  const byKey = new Map<string, Doc<"automations">>()

  for (const automation of automations) {
    if (
      automation.playbook === undefined ||
      byKey.has(automation.playbook.key) ||
      !matchesPlaybookOwner(automation, args.ownerId)
    ) {
      continue
    }

    byKey.set(automation.playbook.key, automation)
  }

  return byKey
}

function matchesPlaybookOwner(
  automation: Doc<"automations">,
  ownerId: Id<"persons"> | undefined
) {
  const definition = playbookCatalog.find(
    (candidate) => candidate.key === automation.playbook?.key
  )

  if (definition === undefined || definition.scope === "organization") {
    return true
  }

  return automation.createdBy === ownerId
}

async function requireNotEnabled(
  ctx: QueryLikeCtx,
  args: {
    definition: PlaybookDefinition
    ownerId: Id<"persons">
    organizationId: string
  }
) {
  const enabled = await readPlaybookAutomations(ctx, args)

  if (enabled.has(args.definition.key)) {
    throw new Error(`${args.definition.title} is already enabled.`)
  }
}
