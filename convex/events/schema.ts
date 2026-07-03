import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import { actorValidator } from "../shared/actor"

const eventMatchValue = v.union(v.string(), v.number())
export const eventMatch = v.record(v.string(), eventMatchValue)

const slackData = v.object({
  channel: v.object({
    id: v.string(),
    name: v.optional(v.string()),
  }),
  event: v.optional(v.object({ id: v.string() })),
  thread: v.optional(v.object({ ts: v.string() })),
  ts: v.optional(v.string()),
})

const githubData = v.object({
  action: v.optional(v.string()),
  repository: v.object({
    id: v.optional(v.number()),
    owner: v.optional(v.string()),
    name: v.optional(v.string()),
    fullName: v.string(),
    url: v.optional(v.string()),
    cloneUrl: v.optional(v.string()),
    defaultBranch: v.optional(v.string()),
  }),
  issueNumber: v.optional(v.number()),
  pullNumber: v.optional(v.number()),
  isPullRequest: v.optional(v.boolean()),
  issue: v.optional(
    v.object({
      id: v.optional(v.number()),
      number: v.optional(v.number()),
      title: v.optional(v.string()),
      url: v.optional(v.string()),
    })
  ),
  pullRequest: v.optional(
    v.object({
      id: v.optional(v.number()),
      number: v.optional(v.number()),
      title: v.optional(v.string()),
      url: v.optional(v.string()),
    })
  ),
  comment: v.optional(
    v.object({
      id: v.optional(v.string()),
      nodeId: v.optional(v.string()),
      url: v.optional(v.string()),
      apiUrl: v.optional(v.string()),
      kind: v.optional(v.string()),
      path: v.optional(v.string()),
      line: v.optional(v.number()),
      side: v.optional(v.string()),
      commitId: v.optional(v.string()),
      inReplyToId: v.optional(v.string()),
      reviewId: v.optional(v.string()),
    })
  ),
})

const linearData = v.object({
  action: v.optional(v.string()),
  issueId: v.string(),
  issueIdentifier: v.optional(v.string()),
  teamId: v.optional(v.string()),
  projectId: v.optional(v.string()),
  issue: v.optional(
    v.object({
      id: v.optional(v.string()),
      identifier: v.optional(v.string()),
      title: v.optional(v.string()),
      url: v.optional(v.string()),
    })
  ),
  commentId: v.optional(v.string()),
  url: v.optional(v.string()),
})

const notionEntity = v.object({
  id: v.string(),
  type: v.string(),
})

const notionData = v.object({
  notionEventId: v.string(),
  notionEventType: v.string(),
  workspaceId: v.string(),
  workspaceName: v.optional(v.string()),
  subscriptionId: v.optional(v.string()),
  notionIntegrationId: v.optional(v.string()),
  attemptNumber: v.optional(v.number()),
  apiVersion: v.optional(v.string()),
  entity: notionEntity,
  parent: v.optional(notionEntity),
  page: v.optional(
    v.object({
      id: v.string(),
      title: v.optional(v.string()),
      url: v.optional(v.string()),
    })
  ),
  pageId: v.optional(v.string()),
  commentId: v.optional(v.string()),
})

export const eventData = v.union(slackData, githubData, linearData, notionData)

export const events = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  key: v.string(),
  type: v.string(),
  match: v.optional(eventMatch),
  actor: v.optional(actorValidator),
  text: v.optional(v.string()),
  data: v.optional(eventData),
  observedAt: v.optional(v.number()),
})
  .index("by_integration_and_key", ["integrationId", "key"])
  .index("by_tenant", ["tenantId"])

export type EventData = Infer<typeof eventData>
export type EventMatch = Infer<typeof eventMatch>
