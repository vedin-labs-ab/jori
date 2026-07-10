import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { internalQuery } from "../../_generated/server"
import { isLinearIssueCommentEvent } from "../../automations/names"
import { findActiveIntegrationByExternalId } from "../../integrations/data"

const issueMatch = v.object({
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
    match: issueMatch,
  },
  handler: async (ctx, args): Promise<IssueProjectHydrationPlan> => {
    const integration = await findActiveIntegrationByExternalId(ctx, {
      externalId: args.accountId,
      integration: "linear",
    })

    if (integration === null) {
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
          match: args.match,
        })
      ),
    }
  },
})

export function shouldHydrateLinearIssueProject(args: {
  automation: Doc<"automations">
  integrationId: Id<"integrations">
  event: string
  match: {
    issue: string
    team?: string
  }
}) {
  const trigger = args.automation.trigger

  if (
    args.automation.type !== "event" ||
    !("integrationId" in trigger) ||
    trigger.integrationId !== args.integrationId ||
    trigger.event !== args.event ||
    trigger.match?.project === undefined
  ) {
    return false
  }

  return (
    matchAllowsKnownValue(trigger.match, "issue", args.match.issue) &&
    matchAllowsKnownValue(trigger.match, "team", args.match.team)
  )
}

function matchAllowsKnownValue(
  match: NonNullable<
    Extract<Doc<"automations">["trigger"], { event: string }>["match"]
  >,
  key: string,
  value: string | undefined
) {
  const expected = match[key]

  return expected === undefined || value === undefined || expected === value
}
