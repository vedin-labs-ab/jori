import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { internalQuery } from "../../_generated/server"
import { isLinearIssueCommentEvent } from "../../automations/names"

const issueCriteria = v.object({
  issue: v.string(),
  team: v.optional(v.string()),
})

type IssueProjectHydrationPlan =
  | {
      status: "missing_integration"
    }
  | {
      status: "ready"
      integration: Doc<"integrations">
      required: boolean
    }

export const issueProject = internalQuery({
  args: {
    accountId: v.string(),
    event: v.string(),
    criteria: issueCriteria,
  },
  handler: async (ctx, args): Promise<IssueProjectHydrationPlan> => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_integration_and_external", (query) =>
        query.eq("integration", "linear").eq("externalId", args.accountId)
      )
      .first()

    if (integration === null || integration.status !== "active") {
      return { status: "missing_integration" }
    }

    if (!isLinearIssueCommentEvent(args.event)) {
      return { status: "ready", integration, required: false }
    }

    const automations = await ctx.db
      .query("automations")
      .withIndex("by_tenant_status", (query) =>
        query.eq("tenantId", integration.tenantId).eq("status", "active")
      )
      .collect()

    return {
      status: "ready",
      integration,
      required: automations.some((automation) =>
        shouldHydrateLinearIssueProject({
          automation,
          integrationId: integration._id,
          event: args.event,
          criteria: args.criteria,
        })
      ),
    }
  },
})

export function shouldHydrateLinearIssueProject(args: {
  automation: Doc<"automations">
  integrationId: Id<"integrations">
  event: string
  criteria: {
    issue: string
    team?: string
  }
}) {
  const trigger = args.automation.trigger

  if (
    trigger.type !== "event" ||
    trigger.integrationId !== args.integrationId ||
    trigger.event !== args.event ||
    trigger.criteria?.project === undefined
  ) {
    return false
  }

  return (
    knownCriterionMatches(trigger.criteria, "issue", args.criteria.issue) &&
    knownCriterionMatches(trigger.criteria, "team", args.criteria.team)
  )
}

function knownCriterionMatches(
  criteria: NonNullable<
    Extract<Doc<"automations">["trigger"], { type: "event" }>["criteria"]
  >,
  key: string,
  value: string | undefined
) {
  const expected = criteria[key]

  return expected === undefined || value === undefined || expected === value
}
