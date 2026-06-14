import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { summarizeApproval } from "../../approvals/summary"
import { getExecutionContext } from "./context"
import {
  executionInstructions,
  executionSourceParts,
  executionTitle,
  triggerLabel,
} from "./labels"

export async function summarizeExecution(
  ctx: QueryCtx,
  execution: Doc<"executions">,
  requestedApproval?: Doc<"approvals">
) {
  const context = await getExecutionContext(ctx, execution, requestedApproval)
  const title = executionTitle(context)
  const instructions = executionInstructions(context)
  const stoppedBy = await stoppedByLabel(ctx, execution)
  const sourceParts = executionSourceParts(context, stoppedBy)

  return {
    id: execution._id,
    status: execution.status,
    title,
    sourceParts,
    instructions,
    trigger: triggerLabel(context),
    createdAt: execution.createdAt,
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
      instructions,
      sourceParts,
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
    instructions: string | undefined
    sourceParts: string[]
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
    input.instructions,
    input.automation?.name,
    input.event?.type,
    input.event?.resource,
    input.integration?.provider,
    ...input.sourceParts,
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
