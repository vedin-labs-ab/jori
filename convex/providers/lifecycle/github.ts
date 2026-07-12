import {
  commitLifecycleEvent,
  issueLifecycleEvent,
  pullRequestLifecycleEvent,
} from "../../../contracts/automations/events/names"
import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
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
  repository?: {
    full_name?: string
    html_url?: string
    default_branch?: string
  }
  sender?: { id?: number; login?: string; type?: string }
  ref?: string
  deleted?: boolean
  commits?: PushCommit[]
  issue?: { number?: number; title?: string; html_url?: string }
  pull_request?: {
    number?: number
    title?: string
    merged?: boolean
    html_url?: string
  }
}

type PushCommit = {
  message?: string
  added?: string[]
  removed?: string[]
  modified?: string[]
}

// Issue, pull request, and default-branch push changes, recorded as events
// for deduction. Comments stay on the message path.
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
        : args.event === "push"
          ? readPushChange(args.payload, repository)
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

// Direct pushes to the default branch are landed work; feature branches stay
// out until a pull request lands them. One event per push, never per commit,
// with every commit subject listed so batch pushes lose no narrative.
function readPushChange(payload: LifecyclePayload, repository: string) {
  const branch = payload.repository?.default_branch
  const commits = payload.commits ?? []

  if (
    branch === undefined ||
    payload.ref !== `refs/heads/${branch}` ||
    payload.deleted === true ||
    commits.length === 0
  ) {
    return null
  }

  const count = commits.length === 1 ? "1 commit" : `${commits.length} commits`
  const areas = touchedAreas(commits)
  const where = areas.length === 0 ? "" : ` (${areas.join(", ")})`
  const header = `${count} pushed to ${branch} in ${repository}${where}`
  const subjects = commitSubjects(commits)

  return {
    type: commitLifecycleEvent.pushed,
    text:
      subjects.length === 0 ? header : [`${header}:`, ...subjects].join("\n"),
    data: { repository: { fullName: repository } },
  }
}

// A push webhook carries up to 2048 commits, so the payload is the full story
// at sane push sizes; the subject cap only bounds judge input on pathological
// pushes.
const maxCommitSubjects = 50
const maxTouchedAreas = 8

function commitSubjects(commits: PushCommit[]) {
  const subjects = commits
    .map((commit) => commit.message?.split("\n")[0] ?? "")
    .filter((subject) => subject !== "")
    .map((subject) => `- ${subject}`)

  if (subjects.length <= maxCommitSubjects) {
    return subjects
  }

  return [
    ...subjects.slice(0, maxCommitSubjects),
    `…and ${subjects.length - maxCommitSubjects} more`,
  ]
}

// Top-level path segments give the judge a cheap hint at which part of the
// codebase the work touches.
function touchedAreas(commits: PushCommit[]) {
  const areas = new Set<string>()

  for (const commit of commits) {
    const paths = [
      ...(commit.added ?? []),
      ...(commit.removed ?? []),
      ...(commit.modified ?? []),
    ]

    for (const path of paths) {
      areas.add(path.split("/")[0] ?? path)
    }
  }

  return [...areas].sort().slice(0, maxTouchedAreas)
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
