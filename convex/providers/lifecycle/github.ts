import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import {
  issueLifecycleEvent,
  pullRequestLifecycleEvent,
} from "../../automations/names"
import { type EventData } from "../../events/schema"
import { type Actor, createIntegrationActor } from "../../shared/actor"

export type GitHubLifecycleEvent = {
  accountId: string
  key: string
  type: string
  text: string
  actor?: Actor
  data: EventData
}

type LifecyclePayload = {
  action?: string
  installation?: { id?: number }
  repository?: { full_name?: string; html_url?: string }
  sender?: { id?: number; login?: string; type?: string }
  issue?: { number?: number; title?: string; html_url?: string }
  pull_request?: {
    number?: number
    title?: string
    merged?: boolean
    html_url?: string
  }
}

// Issue and pull request lifecycle changes, recorded as events for deduction.
// Comments stay on the message path; this reader only handles state changes.
export function getGitHubLifecycleEvent(args: {
  event: string | null
  payload: LifecyclePayload
  deliveryId: string | null
}): GitHubLifecycleEvent | null {
  const installationId = args.payload.installation?.id
  const repository = args.payload.repository?.full_name

  if (
    installationId === undefined ||
    repository === undefined ||
    args.deliveryId === null
  ) {
    return null
  }

  const change =
    args.event === "issues"
      ? readIssueChange(args.payload, repository)
      : args.event === "pull_request"
        ? readPullRequestChange(args.payload, repository)
        : null

  if (change === null) {
    return null
  }

  return {
    accountId: String(installationId),
    key: `github:lifecycle:${args.deliveryId}`,
    actor: createIntegrationActor({
      externalId: readSenderId(args.payload),
      name: args.payload.sender?.login,
      kind: args.payload.sender?.type === "Bot" ? "bot" : "person",
    }),
    ...change,
  }
}

function readIssueChange(payload: LifecyclePayload, repository: string) {
  const action = readLifecycleAction(payload.action, issueLifecycleEvent)
  const number = payload.issue?.number

  if (action === null || number === undefined) {
    return null
  }

  return {
    type: issueLifecycleEvent[action],
    text: `Issue #${number} ${action} in ${repository}: ${payload.issue?.title ?? ""}`.trim(),
    data: {
      action: payload.action,
      repository: { fullName: repository },
      issueNumber: number,
      issue: {
        number,
        title: payload.issue?.title,
        url: payload.issue?.html_url,
      },
    },
  }
}

function readPullRequestChange(payload: LifecyclePayload, repository: string) {
  const merged = payload.pull_request?.merged === true
  const action =
    payload.action === "closed" && merged
      ? ("merged" as const)
      : readLifecycleAction(payload.action, pullRequestLifecycleEvent)
  const number = payload.pull_request?.number

  if (action === null || number === undefined) {
    return null
  }

  return {
    type: pullRequestLifecycleEvent[action],
    text: `Pull request #${number} ${action} in ${repository}: ${payload.pull_request?.title ?? ""}`.trim(),
    data: {
      action: payload.action,
      repository: { fullName: repository },
      pullNumber: number,
      isPullRequest: true,
      pullRequest: {
        number,
        title: payload.pull_request?.title,
        url: payload.pull_request?.html_url,
      },
    },
  }
}

function readLifecycleAction<Events extends Record<string, string>>(
  action: string | undefined,
  events: Events
): (keyof Events & string) | null {
  return action !== undefined && action in events
    ? (action as keyof Events & string)
    : null
}

function readSenderId(payload: LifecyclePayload) {
  return payload.sender?.id === undefined
    ? undefined
    : String(payload.sender.id)
}

export async function recordGitHubLifecycleEvent(
  ctx: ActionCtx,
  webhook: Parameters<typeof getGitHubLifecycleEvent>[0]
) {
  const lifecycle = getGitHubLifecycleEvent(webhook)

  if (lifecycle === null) {
    return
  }

  await ctx.runMutation(internal.events.ingest.recordFromProvider, {
    integration: "github",
    externalId: lifecycle.accountId,
    key: lifecycle.key,
    type: lifecycle.type,
    actor: lifecycle.actor,
    text: lifecycle.text,
    data: lifecycle.data,
  })
}
