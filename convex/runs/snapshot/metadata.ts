import { readNumber, readString, readValue } from "../../shared/input"
import { type Integration } from "../../shared/integrations"
import { compactDetails, detail, type ExecutionDetail } from "../detail"

export function createSourceMetadata(args: {
  data: unknown
  integration: Integration
}): ExecutionDetail[] {
  if (args.integration === "slack") {
    return slackMetadata(args.data)
  }

  if (args.integration === "github") {
    return githubMetadata(args.data)
  }

  if (args.integration === "linear") {
    return linearMetadata(args.data)
  }

  if (args.integration === "notion") {
    return notionMetadata(args.data)
  }

  if (args.integration === "gmail" || args.integration === "microsoftEmail") {
    return emailMetadata(args.data)
  }

  if (
    args.integration === "googleCalendar" ||
    args.integration === "microsoftCalendar"
  ) {
    return calendarMetadata(args.data)
  }

  return []
}

function slackMetadata(data: unknown) {
  const channel = readObject(data, "channel")
  const name = readString(channel, "name")

  return compactDetails([
    detail("channel", name === undefined ? undefined : `#${name}`),
  ])
}

function githubMetadata(data: unknown) {
  const repository = readObject(data, "repository")

  return compactDetails([
    detail(
      "repository",
      readString(repository, "name") ??
        repositoryName(readString(repository, "fullName")),
      { url: readString(repository, "url") }
    ),
    githubTarget(data),
  ])
}

function githubTarget(data: unknown) {
  const issue = readObject(data, "issue")
  const pullRequest = readObject(data, "pullRequest")
  const isPullRequest =
    readBoolean(data, "isPullRequest") ||
    pullRequest !== undefined ||
    readNumber(data, "pullNumber") !== undefined
  const target = isPullRequest ? (pullRequest ?? issue) : issue
  const number = isPullRequest
    ? (readNumber(data, "pullNumber") ??
      readNumber(pullRequest, "number") ??
      readNumber(issue, "number"))
    : (readNumber(data, "issueNumber") ?? readNumber(issue, "number"))

  return detail(
    isPullRequest ? "pull_request" : "issue",
    githubIssueLikeLabel(number, readString(target, "title")),
    { url: readString(target, "url") }
  )
}

function repositoryName(fullName: string | undefined) {
  return fullName?.split("/").filter(Boolean).at(-1)
}

function linearMetadata(data: unknown) {
  const issue = readObject(data, "issue")
  const project = readObject(issue, "project")

  return compactDetails([
    detail("project", readString(project, "name")),
    detail(
      "issue",
      issueIdentifierLabel(
        readString(data, "issueIdentifier") ??
          readString(issue, "identifier") ??
          readString(data, "issueId"),
        readString(issue, "title")
      ),
      { url: readString(issue, "url") }
    ),
  ])
}

export function githubIssueLikeLabel(
  number: number | undefined,
  title: string | undefined
) {
  return issueIdentifierLabel(
    number === undefined ? undefined : `#${number}`,
    title
  )
}

export function issueIdentifierLabel(
  identifier: string | undefined,
  title: string | undefined
) {
  if (identifier === undefined || title === undefined) {
    return identifier ?? title
  }

  return `${identifier}: ${title}`
}

function notionMetadata(data: unknown) {
  const page = readObject(data, "page")

  return compactDetails([
    detail("page", readString(page, "title") ?? readString(data, "pageTitle"), {
      url: readString(page, "url"),
    }),
  ])
}

function emailMetadata(data: unknown) {
  const from = readObject(data, "from")
  const sender = readObject(data, "sender")

  return compactDetails([
    detail("subject", readString(data, "subject") ?? readString(data, "title")),
    detail(
      "sender",
      readString(from, "email") ??
        readString(sender, "email") ??
        readString(data, "sender") ??
        readString(data, "from")
    ),
  ])
}

function calendarMetadata(data: unknown) {
  const event = readObject(data, "event")

  return compactDetails([
    detail(
      "calendar_event",
      readString(event, "name") ??
        readString(event, "title") ??
        readString(event, "summary") ??
        readString(data, "eventName") ??
        readString(data, "summary")
    ),
  ])
}

function readObject(data: unknown, key: string) {
  const value = readValue(data, key)

  return typeof value === "object" && value !== null ? value : undefined
}

function readBoolean(data: unknown, key: string) {
  return readValue(data, key) === true
}
