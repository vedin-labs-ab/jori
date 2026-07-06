import { type Integration } from "../../contracts/integrations"
import { readNumber, readString, readValue } from "../shared/input"
import {
  type EventData,
  type GitHubEventData,
  type LinearEventData,
  type NotionEventData,
  type SlackEventData,
} from "./schema"

export function normalizeEventData(
  integration: Integration,
  data: unknown
): EventData | undefined {
  switch (integration) {
    case "slack":
      return slackData(data)
    case "github":
      return githubData(data)
    case "linear":
      return linearData(data)
    case "notion":
      return notionData(data)
    default:
      return undefined
  }
}

function slackData(data: unknown): SlackEventData | undefined {
  const channel = readObject(data, "channel")
  const channelId = readString(channel, "id")

  if (channelId === undefined) {
    return undefined
  }

  return compact({
    channel: compact({
      id: channelId,
      name: readString(channel, "name"),
    }),
    event: optionalObject({ id: readNestedString(data, "event", "id") }),
    thread: optionalObject({ ts: readNestedString(data, "thread", "ts") }),
    ts: readString(data, "ts"),
  }) as SlackEventData
}

function githubData(data: unknown): GitHubEventData | undefined {
  const repository = readObject(data, "repository")
  const fullName = readString(repository, "fullName")
  const comment = readObject(data, "comment")
  const issue = readObject(data, "issue")
  const pullRequest = readObject(data, "pullRequest")

  if (fullName === undefined) {
    return undefined
  }

  return compact({
    action: readString(data, "action"),
    repository: compact({
      id: readNumber(repository, "id"),
      owner: readString(repository, "owner"),
      name: readString(repository, "name"),
      fullName,
      url: readString(repository, "url"),
      cloneUrl: readString(repository, "cloneUrl"),
      defaultBranch: readString(repository, "defaultBranch"),
    }),
    issueNumber: readNumber(data, "issueNumber"),
    pullNumber: readNumber(data, "pullNumber"),
    isPullRequest: readBoolean(data, "isPullRequest"),
    issue: optionalObject({
      id: readNumber(issue, "id"),
      number: readNumber(issue, "number"),
      title: readString(issue, "title"),
      url: readString(issue, "url"),
    }),
    pullRequest: optionalObject({
      id: readNumber(pullRequest, "id"),
      number: readNumber(pullRequest, "number"),
      title: readString(pullRequest, "title"),
      url: readString(pullRequest, "url"),
    }),
    comment: optionalObject({
      id: readString(comment, "id"),
      nodeId: readString(comment, "nodeId"),
      url: readString(comment, "url"),
      apiUrl: readString(comment, "apiUrl"),
      kind: readString(comment, "kind"),
      path: readString(comment, "path"),
      line: readNumber(comment, "line"),
      side: readString(comment, "side"),
      commitId: readString(comment, "commitId"),
      inReplyToId: readString(comment, "inReplyToId"),
      reviewId: readString(comment, "reviewId"),
    }),
  }) as GitHubEventData
}

// Linear events anchor on an issue or a project; at least one id is present.
function linearData(data: unknown): LinearEventData | undefined {
  const issue = readObject(data, "issue")
  const project = readObject(data, "project")
  const issueId = readString(data, "issueId")
  const projectId = readString(data, "projectId")

  if (issueId === undefined && projectId === undefined) {
    return undefined
  }

  return compact({
    action: readString(data, "action"),
    issueId,
    issueIdentifier: readString(data, "issueIdentifier"),
    teamId: readString(data, "teamId"),
    projectId,
    issue: optionalObject({
      id: readString(issue, "id"),
      identifier: readString(issue, "identifier"),
      title: readString(issue, "title"),
      url: readString(issue, "url"),
    }),
    project: optionalObject({
      id: readString(project, "id"),
      name: readString(project, "name"),
      url: readString(project, "url"),
    }),
    commentId: readString(data, "commentId"),
    url: readString(data, "url"),
  }) as LinearEventData
}

function notionData(data: unknown): NotionEventData | undefined {
  const notionEventId = readString(data, "notionEventId")
  const notionEventType = readString(data, "notionEventType")
  const workspaceId = readString(data, "workspaceId")
  const entity = entityData(readObject(data, "entity"))

  if (
    notionEventId === undefined ||
    notionEventType === undefined ||
    workspaceId === undefined ||
    entity === undefined
  ) {
    return undefined
  }

  return compact({
    notionEventId,
    notionEventType,
    workspaceId,
    workspaceName: readString(data, "workspaceName"),
    subscriptionId: readString(data, "subscriptionId"),
    notionIntegrationId: readString(data, "notionIntegrationId"),
    attemptNumber: readNumber(data, "attemptNumber"),
    apiVersion: readString(data, "apiVersion"),
    entity,
    parent: entityData(readObject(data, "parent")),
    page: pageData(readObject(data, "page")),
    pageId: readString(data, "pageId"),
    commentId: readString(data, "commentId"),
  }) as NotionEventData
}

function pageData(data: unknown) {
  const id = readString(data, "id")

  if (id === undefined) {
    return undefined
  }

  return compact({
    id,
    title: readString(data, "title"),
    url: readString(data, "url"),
  })
}

function entityData(data: unknown) {
  const id = readString(data, "id")
  const type = readString(data, "type")

  return id === undefined || type === undefined ? undefined : { id, type }
}

function optionalObject<T extends Record<string, unknown>>(value: T) {
  const result = compact(value)

  return Object.keys(result).length === 0 ? undefined : result
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T
}

function readObject(data: unknown, key: string) {
  const value = readValue(data, key)

  return typeof value === "object" && value !== null ? value : undefined
}

function readBoolean(data: unknown, key: string) {
  const value = readValue(data, key)

  return typeof value === "boolean" ? value : undefined
}

function readNestedString(data: unknown, key: string, nestedKey: string) {
  return readString(readObject(data, key), nestedKey)
}
