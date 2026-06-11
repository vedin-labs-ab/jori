import { type Doc } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { type Actor } from "../shared/actor"
import { summarizeApproval } from "./approval"
import { providerLabel } from "./labels"

export async function summarizeExecution(
  ctx: QueryCtx,
  execution: Doc<"executions">,
  requestedApproval?: Doc<"approvals">
) {
  const context = await getExecutionContext(ctx, execution, requestedApproval)
  const title =
    context.approval?.handoff.objective ??
    context.schedule?.name ??
    firstLine(context.message?.text) ??
    titleFromTrigger(context.trigger)
  const sourceParts = sourceLabels(context)

  return {
    id: execution._id,
    status: execution.status,
    title,
    sourceParts,
    objective:
      context.approval?.handoff.objective ??
      context.schedule?.description ??
      context.message?.text,
    progress: context.approval?.handoff.progress ?? execution.error,
    next: context.approval?.handoff.next,
    trigger: triggerLabel(context.trigger, context.integration?.provider),
    createdAt: execution.createdAt,
    finishedAt: execution.finishedAt,
    stoppedAt: execution.stoppedAt,
    stoppedBy: execution.stoppedBy,
    durationMs: getDuration(execution),
    sandboxId: execution.sandboxId,
    hash: execution.hash,
    promptId: execution.promptId,
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
      sourceParts,
      ...context,
    }),
  }
}

async function getExecutionContext(
  ctx: QueryCtx,
  execution: Doc<"executions">,
  requestedApproval: Doc<"approvals"> | undefined
) {
  const trigger = await ctx.db.get(execution.triggerId)
  const continuationApproval =
    execution.approvalId === undefined
      ? null
      : await ctx.db.get(execution.approvalId)
  const executionRequestedApproval =
    requestedApproval ?? (await getLatestRequestedApproval(ctx, execution))
  const approval = executionRequestedApproval ?? continuationApproval
  const message =
    trigger?.messageId === undefined
      ? null
      : await ctx.db.get(trigger.messageId)
  const schedule =
    trigger?.scheduleId === undefined
      ? null
      : await ctx.db.get(trigger.scheduleId)
  const integration =
    message?.integrationId === undefined
      ? null
      : await ctx.db.get(message.integrationId)
  const approvalDeliveryIntegration =
    executionRequestedApproval?.delivery === undefined
      ? null
      : await ctx.db.get(executionRequestedApproval.delivery.integrationId)

  return {
    approval,
    approvalDeliveryIntegration,
    integration,
    message,
    requestedApproval: executionRequestedApproval,
    schedule,
    trigger,
  }
}

async function getLatestRequestedApproval(
  ctx: QueryCtx,
  execution: Doc<"executions">
) {
  return await ctx.db
    .query("approvals")
    .withIndex("by_execution", (index) =>
      index.eq("executionId", execution._id)
    )
    .order("desc")
    .first()
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
    input.trigger?.type,
    input.message?.text,
    input.schedule?.name,
    input.schedule?.description,
    input.integration?.provider,
    ...input.sourceParts,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function sourceLabels({
  approval,
  integration,
  message,
  schedule,
}: {
  approval: Doc<"approvals"> | null
  integration: Doc<"integrations"> | null
  message: Doc<"messages"> | null
  schedule: Doc<"schedules"> | null
}) {
  if (schedule !== null) {
    return [
      "Schedule",
      schedule.type === "recurring" ? "Recurring" : "One shot",
    ]
  }

  if (message !== null) {
    return [
      providerLabel(integration?.provider),
      message.type,
      actorLabel(message.actor),
    ].filter((part): part is string => part !== undefined && part !== "")
  }

  if (approval !== null) {
    return [
      providerLabel(approval.provider),
      actorLabel(approval.requestedBy),
    ].filter((part): part is string => part !== undefined && part !== "")
  }

  return ["Manual run"]
}

function titleFromTrigger(trigger: Doc<"triggers"> | null) {
  if (trigger?.type === "scheduled") {
    return "Scheduled execution"
  }

  if (trigger?.type === "message") {
    return "Message execution"
  }

  return "Manual execution"
}

function triggerLabel(
  trigger: Doc<"triggers"> | null,
  provider: string | undefined
) {
  if (trigger?.type === "scheduled") {
    return "Schedule trigger"
  }

  if (trigger?.type === "message") {
    return `${providerLabel(provider)} message`
  }

  return "Manual run"
}

function actorLabel(actor: Actor | undefined) {
  if (actor === undefined) {
    return undefined
  }

  if ("email" in actor && actor.email !== undefined) {
    return actor.email
  }

  if ("userId" in actor) {
    return actor.userId
  }

  return "provider" in actor ? actor.externalId : undefined
}

function firstLine(text: string | undefined) {
  const line = text?.trim().split("\n").find(Boolean)

  if (line === undefined) {
    return undefined
  }

  return line.length > 90 ? `${line.slice(0, 87)}...` : line
}
