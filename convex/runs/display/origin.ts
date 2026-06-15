import { type Doc } from "../../_generated/dataModel"
import { slackChannelUrl, slackMessageUrl } from "../../providers/slack/links"
import {
  readDataNumber,
  readDataObject,
  readDataString,
} from "../../shared/data"
import {
  githubIssueLikeLabel,
  issueIdentifierLabel,
} from "../../shared/sources/metadata"
import { commentLabel, compactDetails, detail, snippet } from "./detail"

export function originDetails(input: {
  data: unknown
  integration: Doc<"integrations"> | null
  provider: string | undefined
  text: string | undefined
}) {
  if (input.provider === "slack") {
    return slackDetails(input)
  }

  if (input.provider === "github") {
    return githubDetails(input)
  }

  if (input.provider === "linear") {
    return linearDetails(input)
  }

  if (input.provider === "notion") {
    return notionDetails(input)
  }

  return []
}

function slackDetails({
  data,
  integration,
  text,
}: {
  data: unknown
  integration: Doc<"integrations"> | null
  text: string | undefined
}) {
  const channel = readDataObject(data, "channel")
  const channelId =
    readDataString(data, "channelId") ?? readDataString(channel, "id")
  const teamId =
    integration?.provider === "slack" ? integration.externalId : null
  const messageTs = readDataString(data, "ts")

  return compactDetails([
    detail(
      "channel",
      channelLabel(readDataString(channel, "name") ?? channelId),
      { url: slackChannelUrl({ channelId, teamId }) }
    ),
    detail("message", snippet(text) ?? "Message", {
      url: slackMessageUrl({ channelId, messageTs, teamId }),
    }),
  ])
}

function githubDetails({
  data,
  text,
}: {
  data: unknown
  text: string | undefined
}) {
  const repository = readDataObject(data, "repository")
  const issue = readDataObject(data, "issue")
  const pullRequest = readDataObject(data, "pullRequest")
  const comment = readDataObject(data, "comment")
  const explicitPullNumber =
    readDataNumber(data, "pullNumber") ?? readDataNumber(pullRequest, "number")
  const isPullRequest =
    readDataBoolean(data, "isPullRequest") ||
    pullRequest !== undefined ||
    explicitPullNumber !== undefined
  const pullNumber =
    explicitPullNumber ??
    (isPullRequest ? readDataNumber(issue, "number") : undefined)

  return compactDetails([
    detail(
      "repository",
      readDataString(repository, "fullName") ??
        readDataString(repository, "name"),
      { url: readDataString(repository, "url") }
    ),
    isPullRequest
      ? detail(
          "pull_request",
          githubIssueLikeLabel(
            pullNumber,
            readDataString(pullRequest, "title") ??
              readDataString(issue, "title")
          ),
          {
            url:
              readDataString(pullRequest, "url") ??
              readDataString(issue, "url"),
          }
        )
      : detail(
          "issue",
          githubIssueLikeLabel(
            readDataNumber(data, "issueNumber") ??
              readDataNumber(issue, "number"),
            readDataString(issue, "title")
          ),
          { url: readDataString(issue, "url") }
        ),
    detail(
      "comment",
      snippet(text) ?? commentLabel(readDataString(comment, "id")),
      { url: readDataString(comment, "url") }
    ),
  ])
}

function linearDetails({
  data,
  text,
}: {
  data: unknown
  text: string | undefined
}) {
  const issue = readDataObject(data, "issue")

  return compactDetails([
    detail(
      "issue",
      issueIdentifierLabel(
        readDataString(data, "issueIdentifier") ??
          readDataString(issue, "identifier"),
        readDataString(issue, "title")
      ),
      { url: readDataString(issue, "url") }
    ),
    detail(
      "comment",
      snippet(text) ?? commentLabel(readDataString(data, "commentId")),
      { url: readDataString(data, "url") }
    ),
  ])
}

function notionDetails({
  data,
  text,
}: {
  data: unknown
  text: string | undefined
}) {
  const page = readDataObject(data, "page")

  return compactDetails([
    detail(
      "page",
      readDataString(page, "title") ??
        readDataString(data, "pageTitle") ??
        readDataString(data, "pageId"),
      { url: readDataString(page, "url") }
    ),
    detail(
      "comment",
      snippet(text) ?? commentLabel(readDataString(data, "commentId")),
      { url: readDataString(data, "commentUrl") }
    ),
  ])
}

function channelLabel(label: string | undefined) {
  if (label === undefined) {
    return undefined
  }

  return label.startsWith("#") || /^[CGD][A-Z0-9]+$/.test(label)
    ? label
    : `#${label}`
}

function readDataBoolean(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return false
  }

  return (data as Record<string, unknown>)[key] === true
}
