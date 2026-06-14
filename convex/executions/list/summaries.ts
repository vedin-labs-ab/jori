import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { summarizeApproval } from "../../approvals/summary"
import { getExecutionContext } from "./context"
import { executionDetails } from "./details"
import { executionTask, executionTitle, triggerLabel } from "./labels"
import { executionSource, sourceSearchText } from "./source"

export async function summarizeExecution(
  ctx: QueryCtx,
  execution: Doc<"executions">,
  requestedApproval?: Doc<"approvals">
) {
  const context = await getExecutionContext(ctx, execution, requestedApproval)
  const title = executionTitle(context)
  const task = executionTask(context)
  const stoppedBy = await stoppedByLabel(ctx, execution)
  const source = executionSource(context, stoppedBy)

  return {
    id: execution._id,
    status: execution.status,
    title,
    source,
    task,
    trigger: triggerLabel(context),
    createdAt: execution.createdAt,
    details: executionDetails({
      approval: context.requestedApproval,
      event: context.event,
      execution,
      integration: context.integration,
      message: context.message,
      source,
      stoppedBy,
    }),
    finishedAt: execution.finishedAt,
    durationMs: getDuration(execution),
    traceFileId: storedTraceFileId(execution),
    error: execution.error,
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
      execution,
      title,
      source,
      task,
      ...context,
    }),
  }
}

function storedTraceFileId(execution: Doc<"executions">) {
  const trace = execution.trace

  return trace !== undefined && "fileId" in trace ? trace.fileId : undefined
}

function getDuration(execution: Doc<"executions">) {
  if (execution.finishedAt === undefined) {
    return undefined
  }

  return Math.max(0, execution.finishedAt - execution.createdAt)
}

function searchableText(
  input: Awaited<ReturnType<typeof getExecutionContext>> & {
    execution: Doc<"executions">
    source: ReturnType<typeof executionSource>
    task: string
    title: string
  }
) {
  return [
    input.title,
    input.execution.status,
    input.execution.error,
    input.approval?.summary,
    input.approval?.handoff.objective,
    input.approval?.handoff.progress,
    input.approval?.tool,
    input.run?.reason.type,
    input.task,
    input.automation?.name,
    input.event?.type,
    input.event?.resource,
    input.event?.provider,
    input.integration?.provider,
    sourceSearchText(input.source),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

async function stoppedByLabel(ctx: QueryCtx, execution: Doc<"executions">) {
  const stoppedBy = execution.stoppedBy

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
        .eq("tenantId", execution.tenantId)
        .eq("provider", "clerk")
        .eq("userId", stoppedBy)
    )
    .first()

  return identity?.email ?? stoppedBy
}

function isClerkUserId(value: string) {
  return value.startsWith("user_")
}
