import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import {
  linearIssueLifecycleEvent,
  linearProjectLifecycleEvent,
} from "../../automations/names"
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

// Issue and Project webhooks reuse the payload's data field with the
// resource's own shape.
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

type LinearProjectData = {
  id?: string
  name?: string
  url?: string
  state?: string
  status?: { name?: string }
}

// Issue and project lifecycle changes recorded as events for deduction.
// Updates count only when the workflow state changed: field edits are noise,
// transitions are signal. Comments stay on the message path.
export function getLinearLifecycleEvent(args: {
  payload: LinearWebhookPayload
  deliveryId: string | null
}): LinearLifecycleEvent | null {
  const accountId = args.payload.organizationId

  if (accountId === undefined || args.deliveryId === null) {
    return null
  }

  const change =
    args.payload.type === "Issue"
      ? readIssueChange(args.payload)
      : args.payload.type === "Project"
        ? readProjectChange(args.payload)
        : null

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
  }
}

function readIssueChange(payload: LinearWebhookPayload) {
  const issue = payload.data as LinearIssueData | undefined
  const change = classifyChange(payload, ["stateId"])

  if (issue?.id === undefined || change === null) {
    return null
  }

  const label = issue.identifier ?? issue.id
  const suffix = [
    issue.title === undefined ? "" : `: ${issue.title}`,
    issue.project?.name === undefined
      ? ""
      : ` (project: ${issue.project.name})`,
  ].join("")
  const state = issue.state?.name ?? "a new state"

  return {
    type: linearIssueLifecycleEvent[change],
    text: {
      created: `Linear issue ${label} created${suffix}`,
      stateChanged: `Linear issue ${label} moved to ${state}${suffix}`,
      removed: `Linear issue ${label} removed${suffix}`,
    }[change],
    data: {
      action: payload.action,
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

// Project state lives in several fields across Linear versions; any of them
// moving counts as a transition.
const projectStateKeys = [
  "stateId",
  "statusId",
  "state",
  "startedAt",
  "completedAt",
  "canceledAt",
]

function readProjectChange(payload: LinearWebhookPayload) {
  const project = payload.data as LinearProjectData | undefined
  const change = classifyChange(payload, projectStateKeys)

  if (project?.id === undefined || change === null) {
    return null
  }

  const label = project.name ?? "project"
  const state = project.status?.name ?? project.state ?? "a new state"

  return {
    type: linearProjectLifecycleEvent[change],
    text: {
      created: `Linear project ${label} created`,
      stateChanged: `Linear project ${label} moved to ${state}`,
      removed: `Linear project ${label} removed`,
    }[change],
    data: {
      action: payload.action,
      projectId: project.id,
      project: { id: project.id, name: project.name, url: project.url },
      url: project.url,
    },
  }
}

function classifyChange(
  payload: LinearWebhookPayload,
  stateKeys: string[]
): "created" | "stateChanged" | "removed" | null {
  if (payload.action === "create") {
    return "created"
  }

  if (payload.action === "remove") {
    return "removed"
  }

  const updatedFrom = payload.updatedFrom
  const stateMoved =
    payload.action === "update" &&
    updatedFrom !== undefined &&
    stateKeys.some((key) => key in updatedFrom)

  return stateMoved ? "stateChanged" : null
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
