import { type Integration } from "../integrations"
import { type SourceMetadataItem } from "./schema"

export function createSourceMetadata(args: {
  data: unknown
  event?: string
  integration: Integration
}): SourceMetadataItem[] {
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

  if (args.integration === "googleDrive") {
    return driveMetadata(args.data)
  }

  return []
}

function slackMetadata(data: unknown) {
  const channel = readObject(data, "channel")
  const name = readString(channel, "name")

  return compactItems([
    item("channel", name === undefined ? undefined : `#${name}`),
  ])
}

function githubMetadata(data: unknown) {
  const repository = readObject(data, "repository")

  return compactItems([
    item(
      "repository",
      readString(repository, "name") ??
        repositoryName(readString(repository, "fullName")),
      readString(repository, "url")
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

  return item(
    isPullRequest ? "pull_request" : "issue",
    githubIssueLikeLabel(number, readString(target, "title")),
    readString(target, "url")
  )
}

function repositoryName(fullName: string | undefined) {
  return fullName?.split("/").filter(Boolean).at(-1)
}

function linearMetadata(data: unknown) {
  const issue = readObject(data, "issue")
  const project = readObject(issue, "project")

  return compactItems([
    item("project", readString(project, "name")),
    item(
      "issue",
      issueIdentifierLabel(
        readString(data, "issueIdentifier") ??
          readString(issue, "identifier") ??
          readString(data, "issueId"),
        readString(issue, "title")
      ),
      readString(issue, "url")
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

  return compactItems([
    item(
      "page",
      readString(page, "title") ?? readString(data, "pageTitle"),
      readString(page, "url")
    ),
  ])
}

function emailMetadata(data: unknown) {
  const from = readObject(data, "from")
  const sender = readObject(data, "sender")

  return compactItems([
    item("subject", readString(data, "subject") ?? readString(data, "title")),
    item(
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

  return compactItems([
    item(
      "event",
      readString(event, "name") ??
        readString(event, "title") ??
        readString(event, "summary") ??
        readString(data, "eventName") ??
        readString(data, "summary")
    ),
  ])
}

function driveMetadata(data: unknown) {
  const folder = readObject(data, "folder")
  const file = readObject(data, "file")

  return compactItems([
    item(
      "folder",
      readString(folder, "name") ?? readString(data, "folderName")
    ),
    item("file", readString(file, "name") ?? readString(data, "fileName")),
  ])
}

function item(
  type: string,
  label: string | undefined,
  url?: string
): SourceMetadataItem | undefined {
  const normalizedLabel = label?.trim()

  if (normalizedLabel === undefined || normalizedLabel === "") {
    return undefined
  }

  return {
    type,
    label: normalizedLabel,
    ...(url === undefined || url === "" ? {} : { url }),
  }
}

function compactItems(items: Array<SourceMetadataItem | undefined>) {
  return items.filter((item): item is SourceMetadataItem => item !== undefined)
}

function readObject(data: unknown, key: string) {
  const value = readValue(data, key)

  return typeof value === "object" && value !== null ? value : undefined
}

function readNumber(data: unknown, key: string) {
  const value = readValue(data, key)

  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function readString(data: unknown, key: string) {
  const value = readValue(data, key)

  return typeof value === "string" && value !== "" ? value : undefined
}

function readBoolean(data: unknown, key: string) {
  return readValue(data, key) === true
}

function readValue(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  return (data as Record<string, unknown>)[key]
}
