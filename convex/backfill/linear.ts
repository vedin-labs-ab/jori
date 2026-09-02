import { linearIssueLifecycleEvent } from "../../contracts/jobs/events/names"
import { type Doc } from "../_generated/dataModel"
import { requireLinearCredentials } from "../integrations/linear/credentials"
import { linearGraphql } from "../integrations/linear/graphql"
import { createIntegrationActor } from "../shared/actor"
import { linearPageSize } from "./limits"
import { type BackfillEvent, type BackfillPage } from "./page"

type IssueNode = {
  id?: string
  identifier?: string
  title?: string
  url?: string
  createdAt?: string
  updatedAt?: string
  team?: { id?: string }
  project?: { id?: string; name?: string; url?: string }
  state?: { name?: string }
  creator?: { id?: string; name?: string; email?: string }
}

type IssuesResult = {
  data?: {
    issues?: {
      pageInfo?: { hasNextPage?: boolean; endCursor?: string | null }
      nodes?: IssueNode[]
    }
  }
}

export type LinearCursor = { after: string | null }

// One connection walk over issues updated inside the window. The date bound
// is inlined as a literal so the query needs no comparator variable typing.
export async function fetchLinearBackfillPage(
  integration: Doc<"integrations">,
  cursor: LinearCursor | undefined,
  window: { start: number; end: number }
): Promise<BackfillPage<LinearCursor>> {
  const credentials = requireLinearCredentials(integration)
  const since = new Date(window.start).toISOString()
  const result = await linearGraphql<IssuesResult>(credentials.tokens.access, {
    query: `
        query BackfillIssues($first: Int!, $after: String) {
          issues(
            first: $first
            after: $after
            filter: { updatedAt: { gte: "${since}" } }
          ) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id identifier title url createdAt updatedAt
              team { id }
              project { id name url }
              state { name }
              creator { id name email }
            }
          }
        }
      `,
    variables: { first: linearPageSize, after: cursor?.after ?? null },
  })

  const connection = result.data?.issues
  const events = (connection?.nodes ?? [])
    .map((node) => readLinearBackfillIssue(node, window))
    .filter((event): event is BackfillEvent => event !== null)
  const endCursor = connection?.pageInfo?.endCursor ?? null

  return {
    events,
    cursor:
      connection?.pageInfo?.hasNextPage === true && endCursor !== null
        ? { after: endCursor }
        : null,
  }
}

// A snapshot per issue: created if it was born inside the window, otherwise a
// state change, dated by Linear's own update clock.
export function readLinearBackfillIssue(
  node: IssueNode,
  window: { start: number; end: number }
): BackfillEvent | null {
  const observedAt = Date.parse(node.updatedAt ?? "")

  if (node.id === undefined || !Number.isFinite(observedAt)) {
    return null
  }

  const createdAt = Date.parse(node.createdAt ?? "")
  const created = Number.isFinite(createdAt) && createdAt >= window.start
  const state = node.state?.name
  const verb = created ? "created" : `moved to ${state ?? "a new state"}`

  return {
    key: `linear:backfill:${node.id}`,
    type: created
      ? linearIssueLifecycleEvent.created
      : linearIssueLifecycleEvent.stateChanged,
    text: `Issue ${node.identifier ?? node.id} ${verb}: ${node.title ?? ""}`.trim(),
    actor: createIntegrationActor({
      externalId: node.creator?.id,
      name: node.creator?.name,
      email: node.creator?.email,
    }),
    data: {
      action: created ? "create" : "update",
      issueId: node.id,
      issueIdentifier: node.identifier,
      teamId: node.team?.id,
      projectId: node.project?.id,
      issue: {
        id: node.id,
        identifier: node.identifier,
        title: node.title,
        url: node.url,
      },
      project:
        node.project?.id === undefined
          ? undefined
          : {
              id: node.project.id,
              name: node.project.name,
              url: node.project.url,
            },
      url: node.url,
    },
    observedAt,
  }
}
