import { type Scope } from "../../../contracts/permissions/scope"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { summarizeApproval } from "../../approvals/summary"
import { personDisplayName } from "../../persons/names"
import { getActorDisplayName } from "../../shared/actor"
import { getRunContext } from "./context"
import { runDetailSummary } from "./details"
import { runTask, runTitle, triggerLabel } from "./labels"
import { summarizeRunOffer } from "./offers"
import { isManualTrigger, runSource, sourceSearchText } from "./source"

export async function summarizeRun(
  ctx: QueryCtx,
  run: Doc<"runs">,
  viewerPersonId?: Id<"persons">,
  requestedApproval?: Doc<"approvals">
) {
  const context = await getRunContext(ctx, run, requestedApproval)
  const title = runTitle(context)
  const task = runTask(context)
  const stoppedByLabel = getActorDisplayName(run.stoppedBy)
  const triggeredByLabel = await manualTriggerLabel(ctx, run, viewerPersonId)
  const source = runSource(context, stoppedByLabel, triggeredByLabel)
  const detailSummary = runDetailSummary({
    approval: context.requestedApproval,
    run: context.run,
    stoppedBy: stoppedByLabel,
    tools: context.prepared.tools,
  })
  const approvals = context.approvals.map((approval, index) =>
    summarizeApproval({
      approval,
      approvalDeliveryIntegration:
        context.approvalDeliveryIntegrations[index] ?? null,
      integration: context.integration,
      message: context.message,
    })
  )
  const offers = context.integrationOffers.map(summarizeRunOffer)

  return {
    id: run._id,
    status: run.status,
    scope: runSummaryScope(run),
    title,
    source,
    task,
    trigger: triggerLabel(context),
    createdAt: run.createdAt,
    details: detailSummary.details,
    endedAt: run.endedAt,
    durationMs: getDuration(run),
    error: run.error,
    approval: approvals.at(0) ?? null,
    approvals,
    offer: offers.at(0) ?? null,
    offers,
    waiter:
      context.activeWaiter === null
        ? null
        : {
            id: context.activeWaiter._id,
            expiresAt: context.activeWaiter.expiresAt,
            state: "waiting" as const,
          },
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

// Who hand-triggered the run: "you" for the viewer's own runs, otherwise the
// triggerer's name. Undefined only for someone else with no named identity.
async function manualTriggerLabel(
  ctx: QueryCtx,
  run: Doc<"runs">,
  viewerPersonId: Id<"persons"> | undefined
) {
  const personId = run.cause.type === "manual" ? run.cause.personId : undefined

  if (!isManualTrigger(run) || personId === undefined) {
    return undefined
  }

  return personId === viewerPersonId
    ? "you"
    : await personDisplayName(ctx, personId)
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
    ...input.approvals.flatMap((approval) => [approval.summary, approval.tool]),
    ...input.integrationOffers.flatMap((offer) => [
      offer.summary,
      offer.integration,
    ]),
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

/** Project the internal audience scope onto the shared personal/organization vocabulary. */
function runSummaryScope(run: Doc<"runs">): Scope {
  return (run.scope ?? "person") === "tenant" ? "organization" : "personal"
}
