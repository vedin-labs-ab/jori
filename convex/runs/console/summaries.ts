import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { summarizeApproval } from "../../approvals/summary"
import { getRunContext } from "./context"
import { runDetailSummary } from "./details"
import { runTask, runTitle, triggerLabel } from "./labels"
import { runSource, sourceSearchText } from "./source"

export async function summarizeRun(
  ctx: QueryCtx,
  run: Doc<"runs">,
  requestedApproval?: Doc<"approvals">
) {
  const context = await getRunContext(ctx, run, requestedApproval)
  const title = runTitle(context)
  const task = runTask(context)
  const stoppedBy = await stoppedByLabel(ctx, run)
  const source = runSource(context, stoppedBy)
  const detailSummary = runDetailSummary({
    approval: context.requestedApproval,
    run: context.run,
    stoppedBy,
    tools: context.prepared.tools,
  })

  return {
    id: run._id,
    status: run.status,
    title,
    source,
    task,
    trigger: triggerLabel(context),
    createdAt: run.createdAt,
    details: detailSummary.details,
    endedAt: run.endedAt,
    durationMs: getDuration(run),
    error: run.error,
    approval:
      context.requestedApproval === null
        ? null
        : summarizeApproval({
            approval: context.requestedApproval,
            approvalDeliveryIntegration: context.approvalDeliveryIntegration,
            integration: context.integration,
            message: context.message,
          }),
    searchableText: searchableText({
      title,
      source,
      task,
      ...context,
    }),
  }
}

function getDuration(run: Doc<"runs">) {
  if (run.endedAt === undefined) {
    return undefined
  }

  return Math.max(0, run.endedAt - run.createdAt)
}

function searchableText(
  input: Awaited<ReturnType<typeof getRunContext>> & {
    run: Doc<"runs">
    source: ReturnType<typeof runSource>
    task: string
    title: string
  }
) {
  return [
    input.title,
    input.run.status,
    input.run.error,
    input.approval?.summary,
    input.approval?.tool,
    input.run.cause.type,
    input.task,
    sourceSearchText(input.source),
    ...input.run.snapshot.context.flatMap((detail) => [
      detail.type,
      detail.label,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

async function stoppedByLabel(ctx: QueryCtx, run: Doc<"runs">) {
  const stoppedBy = run.stoppedBy

  if (stoppedBy === undefined || stoppedBy === "") {
    return undefined
  }

  if (!isClerkUserId(stoppedBy)) {
    return stoppedBy
  }

  const identity = await ctx.db
    .query("identities")
    .withIndex("by_tenant_provider_user", (query) =>
      query
        .eq("tenantId", run.tenantId)
        .eq("provider", "clerk")
        .eq("userId", stoppedBy)
    )
    .first()

  return identity?.email ?? stoppedBy
}

function isClerkUserId(value: string) {
  return value.startsWith("user_")
}
