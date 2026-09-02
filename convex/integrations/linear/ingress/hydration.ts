import { v } from "convex/values"
import { isLinearIssueCommentEvent } from "../../../../contracts/jobs/events/names"
import { type Doc, type Id } from "../../../_generated/dataModel"
import { internalQuery } from "../../../_generated/server"
import { findActiveIntegrationByExternalId } from "../../data"

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

    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_organization_status", (query) =>
        query
          .eq("organizationId", integration.organizationId)
          .eq("status", "active")
      )
      .collect()

    return {
      status: "ready",
      integration,
      required: jobs.some((job) =>
        shouldHydrateLinearIssueProject({
          job,
          integrationId: integration._id,
          event: args.event,
          match: args.match,
        })
      ),
    }
  },
})

export function shouldHydrateLinearIssueProject(args: {
  job: Doc<"jobs">
  integrationId: Id<"integrations">
  event: string
  match: {
    issue: string
    team?: string
  }
}) {
  const trigger = args.job.trigger

  if (
    args.job.type !== "event" ||
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
    Extract<Doc<"jobs">["trigger"], { event: string }>["match"]
  >,
  key: string,
  value: string | undefined
) {
  const expected = match[key]

  return expected === undefined || value === undefined || expected === value
}
