import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { linearIssueLifecycleEvent } from "../../automations/names"
import { type EventData } from "../../events/schema"
import { type Actor, createIntegrationActor } from "../../shared/actor"
import { type LinearWebhookPayload } from "../linear/events"

export type LinearLifecycleEvent = {
  accountId: string
  key: string
  type: string
  text: string
  actor?: Actor
  data: EventData
}

// Issue webhooks reuse the payload's data field with issue-shaped content.
type LinearIssueData = {
  id?: string
  identifier?: string
  title?: string
  url?: string
  teamId?: string
  projectId?: string
  project?: { name?: string }
  state?: { name?: string }
}

// Issue lifecycle changes recorded as events for deduction. Updates count
// only when the workflow state changed: field edits are noise, transitions
// are signal. Comments stay on the message path.
export function getLinearLifecycleEvent(args: {
  payload: LinearWebhookPayload
  deliveryId: string | null
}): LinearLifecycleEvent | null {
  const accountId = args.payload.organizationId
  const issue = args.payload.data as LinearIssueData | undefined

  if (
    args.payload.type !== "Issue" ||
    accountId === undefined ||
    args.deliveryId === null ||
    issue?.id === undefined
  ) {
    return null
  }

  const change = readIssueChange(args.payload, issue)

  if (change === null) {
    return null
  }

  return {
    accountId,
    key: `linear:lifecycle:${args.deliveryId}`,
    actor: createIntegrationActor({
      externalId: args.payload.actor?.id,
      name: args.payload.actor?.name,
      email: args.payload.actor?.email,
      kind: args.payload.actor?.type === "bot" ? "bot" : "person",
    }),
    ...change,
    data: {
      action: args.payload.action,
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      teamId: issue.teamId,
      projectId: issue.projectId,
      issue: {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        url: issue.url,
      },
      url: issue.url,
    },
  }
}

function readIssueChange(
  payload: LinearWebhookPayload & { updatedFrom?: Record<string, unknown> },
  issue: LinearIssueData
) {
  const label = issue.identifier ?? issue.id ?? "issue"
  const suffix = [
    issue.title === undefined ? null : `: ${issue.title}`,
    issue.project?.name === undefined
      ? null
      : ` (project: ${issue.project.name})`,
  ]
    .filter((part) => part !== null)
    .join("")

  if (payload.action === "create") {
    return {
      type: linearIssueLifecycleEvent.created,
      text: `Linear issue ${label} created${suffix}`,
    }
  }

  if (payload.action === "remove") {
    return {
      type: linearIssueLifecycleEvent.removed,
      text: `Linear issue ${label} removed${suffix}`,
    }
  }

  if (
    payload.action === "update" &&
    payload.updatedFrom?.stateId !== undefined
  ) {
    const state = issue.state?.name ?? "a new state"

    return {
      type: linearIssueLifecycleEvent.stateChanged,
      text: `Linear issue ${label} moved to ${state}${suffix}`,
    }
  }

  return null
}

export async function recordLinearLifecycleEvent(
  ctx: ActionCtx,
  args: { payload: LinearWebhookPayload; deliveryId: string | null }
) {
  const lifecycle = getLinearLifecycleEvent(args)

  if (lifecycle === null) {
    return
  }

  await ctx.runMutation(internal.events.ingest.recordFromProvider, {
    integration: "linear",
    externalId: lifecycle.accountId,
    key: lifecycle.key,
    type: lifecycle.type,
    actor: lifecycle.actor,
    text: lifecycle.text,
    data: lifecycle.data,
    observedAt: args.payload.webhookTimestamp,
  })
}
