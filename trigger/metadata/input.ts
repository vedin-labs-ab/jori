import { type RuntimeToolMetadataItem } from "../types"
import {
  compactMetadata,
  countText,
  displayUrl,
  isRecord,
  item,
  readNumber,
  readString,
  readStringArray,
} from "./helpers"
import { reactionInputMetadata } from "./reactions"

export function toolInputMetadata(
  tool: string,
  input: Record<string, unknown>
): RuntimeToolMetadataItem[] {
  if (tool === "send_reply") {
    return []
  }

  if (tool.includes("reaction")) {
    return compactMetadata(reactionInputMetadata(input))
  }

  return compactMetadata([
    ...webInputMetadata(tool, input),
    ...codeInputMetadata(tool, input),
    ...githubInputMetadata(tool, input),
    ...messageInputMetadata(tool, input),
    ...resourceInputMetadata(tool, input),
    ...genericInputMetadata(input),
  ])
}

function webInputMetadata(tool: string, input: Record<string, unknown>) {
  if (tool === "web_search") {
    return [
      item("target", readString(input.query)),
      domainScope(input.includeDomains, "in") ??
        domainScope(input.excludeDomains, "excluding"),
    ]
  }

  if (tool === "web_fetch") {
    return [
      item("target", displayUrl(readString(input.url))),
      item("scope", readString(input.highlightQuery)),
    ]
  }

  return []
}

function codeInputMetadata(tool: string, input: Record<string, unknown>) {
  switch (tool) {
    case "bash":
      return [item("target", readString(input.command))]
    case "git":
      return [item("target", readStringArray(input.args)?.join(" "))]
    case "glob":
    case "grep":
      return [
        item("target", readString(input.pattern)),
        item("scope", readString(input.path) ?? readString(input.include)),
      ]
    case "github_clone_repository":
      return [
        item("target", repositoryLabel(input)),
        item("scope", readString(input.ref) ?? readString(input.directory)),
      ]
    case "read":
      return [item("target", readString(input.path))]
    default:
      return []
  }
}

function githubInputMetadata(tool: string, input: Record<string, unknown>) {
  if (!tool.startsWith("github_")) {
    return []
  }

  return [
    item(
      "target",
      issueOrPullTarget(input) ??
        fileTarget(input) ??
        repositoryLabel(input) ??
        readString(input.query)
    ),
    item("scope", readString(input.state)),
  ]
}

function messageInputMetadata(tool: string, input: Record<string, unknown>) {
  if (tool.includes("search")) {
    return [item("target", readString(input.query) ?? readString(input.q))]
  }

  if (tool.includes("send") || tool.includes("draft")) {
    return [
      item("target", readString(input.subject)),
      item("scope", countText(arrayLength(input.to), "recipient")),
    ]
  }

  if (tool.includes("reply")) {
    return [item("target", readString(input.threadId))]
  }

  if (tool.includes("add_message")) {
    return [
      item("target", channelLabel(input.channel)),
      item(
        "scope",
        readString(input.thread_ts) === undefined ? undefined : "thread"
      ),
    ]
  }

  return []
}

function resourceInputMetadata(tool: string, input: Record<string, unknown>) {
  if (tool.includes("calendar") && isRecord(input.event)) {
    return [
      item(
        "target",
        readString(input.event.summary) ?? readString(input.event.subject)
      ),
      item("scope", countText(arrayLength(input.event.attendees), "attendee")),
    ]
  }

  return [
    item(
      "target",
      targetObjectLabel(input.target) ??
        readString(input.title) ??
        readString(input.name) ??
        readString(input.pageId) ??
        readString(input.fileId) ??
        readString(input.issueId) ??
        readString(input.eventId)
    ),
  ]
}

function genericInputMetadata(input: Record<string, unknown>) {
  return [
    item(
      "target",
      readString(input.query) ??
        readString(input.q) ??
        displayUrl(readString(input.url)) ??
        readString(input.path)
    ),
  ]
}

function repositoryLabel(input: Record<string, unknown>) {
  const owner = readString(input.owner)
  const repo = readString(input.repo)

  return owner === undefined || repo === undefined
    ? undefined
    : `${owner}/${repo}`
}

function issueOrPullTarget(input: Record<string, unknown>) {
  const repo = repositoryLabel(input)
  const number = readNumber(input.issueNumber) ?? readNumber(input.pullNumber)

  return repo === undefined || number === undefined
    ? undefined
    : `${repo}#${number}`
}

function fileTarget(input: Record<string, unknown>) {
  const repo = repositoryLabel(input)
  const path = readString(input.path)

  if (path === undefined) {
    return repo
  }

  return repo === undefined ? path : `${repo}/${path}`
}

function domainScope(value: unknown, prefix: string) {
  const domains = readStringArray(value)

  if (domains === undefined || domains.length === 0) {
    return undefined
  }

  return item("scope", `${prefix} ${domains.slice(0, 2).join(", ")}`)
}

function channelLabel(value: unknown) {
  const channel = readString(value)

  if (channel === undefined) {
    return undefined
  }

  return channel.startsWith("#") ? channel : `channel ${channel}`
}

function targetObjectLabel(value: unknown) {
  if (!isRecord(value)) {
    return undefined
  }

  const id = readString(value.id)
  const type = readString(value.type)

  if (id === undefined) {
    return undefined
  }

  return type === undefined ? id : `${type} ${id}`
}

function arrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : undefined
}
