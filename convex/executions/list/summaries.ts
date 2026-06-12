import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { summarizeApproval } from "../../approvals/summary"
import { providerLabel } from "../../providers/catalog"
import { type Actor } from "../../shared/actor"
import { getExecutionContext } from "./context"

export async function summarizeExecution(
  ctx: QueryCtx,
  execution: Doc<"executions">,
  requestedApproval?: Doc<"approvals">
) {
  const context = await getExecutionContext(ctx, execution, requestedApproval)
  const title =
    context.approval?.handoff.objective ??
    context.automation?.name ??
    firstLine(context.message?.text) ??
    titleFromRun(context.run)
  const stoppedBy = await stoppedByLabel(ctx, execution)
  const sourceParts = executionSourceParts(context, stoppedBy)

  return {
    id: execution._id,
    status: execution.status,
    title,
    sourceParts,
    objective:
      context.approval?.handoff.objective ??
      context.automation?.instructions ??
      context.message?.text,
    progress: context.approval?.handoff.progress ?? execution.error,
    next: context.approval?.handoff.next,
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
    input.message?.text,
    input.automation?.name,
    input.automation?.instructions,
    input.event?.type,
    input.event?.resource,
    input.integration?.provider,
    ...input.sourceParts,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function executionSourceParts(
  context: Awaited<ReturnType<typeof getExecutionContext>>,
  stoppedBy: string | undefined
) {
  const parts = sourceLabels(context)

  if (stoppedBy === undefined) {
    return parts
  }

  return [...parts, `Stopped by ${stoppedBy}`]
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

function sourceLabels({
  approval,
  automation,
  event,
  integration,
  message,
  run,
}: Awaited<ReturnType<typeof getExecutionContext>>) {
  if (automation !== null) {
    if (run?.reason.type === "event") {
      return [
        "Triggered by",
        providerLabel(integration?.provider),
        event?.type ?? "event",
        "for automation:",
        automation.name,
      ].filter((part): part is string => part !== undefined && part !== "")
    }

    return ["Triggered by automation:", automation.name]
  }

  if (message !== null) {
    const provider = providerLabel(integration?.provider)

    return ["Triggered by", actorLabel(message.actor), "in", provider].filter(
      (part): part is string => part !== undefined && part !== ""
    )
  }

  if (approval !== null) {
    const provider = providerLabel(approval.provider)

    return [
      "Triggered by",
      actorLabel(approval.requestedBy),
      "in",
      provider,
    ].filter((part): part is string => part !== undefined && part !== "")
  }

  return ["Manual run"]
}

function titleFromRun(run: Doc<"runs"> | null) {
  if (run?.reason.type === "time") {
    return "Timed automation"
  }

  if (run?.reason.type === "event") {
    return "Event automation"
  }

  if (run?.reason.type === "message") {
    return "Message run"
  }

  return "Manual run"
}

function triggerLabel(
  context: Awaited<ReturnType<typeof getExecutionContext>>
) {
  const run = context.run

  if (run?.reason.type === "time") {
    return "Time automation"
  }

  if (run?.reason.type === "event") {
    return `${providerLabel(context.integration?.provider)} event`
  }

  if (run?.reason.type === "message") {
    return `${providerLabel(context.integration?.provider)} message`
  }

  return "Manual run"
}

function actorLabel(actor: Actor | undefined) {
  if (actor === undefined) {
    return "someone"
  }

  if ("email" in actor && actor.email !== undefined) {
    return actor.email
  }

  if ("userId" in actor) {
    return actor.name ?? actor.email ?? "a user"
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
