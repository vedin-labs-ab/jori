import { type Doc, type Id } from "../../../_generated/dataModel"
import { type QueryCtx } from "../../../_generated/server"
import { personDisplayName } from "../../../persons/names"
import { getActorDisplayName } from "../../../shared/actor"
import { summarizeApproval } from "../../view/approval"
import { runTask, triggerLabel } from "../../view/labels"
import { getRunContext } from "../context"
import { runDetails } from "../details"
import { runMatchesVisibilityFilter } from "../filters"
import { summarizeRunOffer } from "../offers"
import { isManualTrigger, runSource, sourceSearchText } from "../source"

export type RunSummary = Awaited<ReturnType<typeof summarizeRun>>

export async function summarizeRun(
  ctx: QueryCtx,
  run: Doc<"runs">,
  viewerPersonId?: Id<"persons">,
  requestedApproval?: Doc<"approvals">
) {
  const context = await getRunContext(ctx, run, requestedApproval)
  const title = run.snapshot.title
  const task = runTask(context)
  const stoppedByLabel = getActorDisplayName(run.stoppedBy)
  const triggeredByLabel = await manualTriggerLabel(ctx, run, viewerPersonId)
  const source = runSource(context, stoppedByLabel, triggeredByLabel)
  const details = runDetails({
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
    audience: await runAudienceFacet(ctx, run),
    title,
    source,
    job: runJob(context.job),
    task,
    trigger: triggerLabel(context),
    createdAt: run.createdAt,
    details,
    endedAt: run.endedAt,
    durationMs: getDuration(run),
    error: run.error,
    result: run.result,
    approval: approvals.at(0) ?? null,
    approvals,
    offer: offers.at(0) ?? null,
    offers,
    waiter: activeWaiter(context.activeWaiter),
    searchableText: searchableText({
      title,
      source,
      task,
      ...context,
    }),
  }
}

/** The job behind the run, for the row's link to its page; absent for
 *  interactive work and for a job since deleted. */
function runJob(job: Doc<"jobs"> | null) {
  return job === null ? null : { id: job._id, name: job.name }
}

function activeWaiter(waiter: Doc<"waiters"> | null) {
  return waiter === null
    ? null
    : {
        id: waiter._id,
        expiresAt: waiter.expiresAt,
        state: "waiting" as const,
      }
}

/** The console's two-way facet: conversation runs read as personal, since
 *  they belong to the thread their creator was in. */
async function runAudienceFacet(ctx: QueryCtx, run: Doc<"runs">) {
  return (await runMatchesVisibilityFilter(ctx, run, "organization"))
    ? ("organization" as const)
    : ("personal" as const)
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
