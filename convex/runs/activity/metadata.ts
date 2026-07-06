import { isRecord } from "../../../contracts/json"
import { reactionDisplayLabel } from "../../../contracts/reactions"
import {
  arrayLength,
  channelLabel,
  compactMetadata,
  countText,
  displayUrl,
  domainScope,
  fileTarget,
  issueOrPullTarget,
  item,
  noun,
  readString,
  readStringArray,
  repositoryLabel,
  targetObjectLabel,
} from "./helpers"
import { runIntrospectionMetadata } from "./metadata/runs"
import { type ToolResult } from "./read"

export function toolMetadata(args: {
  input: Record<string, unknown> | undefined
  result: ToolResult | undefined
  tool: string
}) {
  if (args.tool === "send_reply") {
    return []
  }

  const runMetadata = runIntrospectionMetadata(
    args.tool,
    args.input,
    args.result
  )

  if (runMetadata.length > 0) {
    return compactMetadata(runMetadata)
  }

  return compactMetadata([
    ...reactionMetadata(args.tool, args.input),
    ...inputMetadata(args.tool, args.input),
    ...resultMetadata(args.tool, args.result),
  ])
}

function inputMetadata(
  tool: string,
  input: Record<string, unknown> | undefined
) {
  if (input === undefined || tool.includes("reaction")) {
    return []
  }

  return [
    ...webInputMetadata(tool, input),
    ...codeInputMetadata(tool, input),
    ...githubInputMetadata(tool, input),
    ...messageInputMetadata(tool, input),
    ...resourceInputMetadata(tool, input),
    ...genericInputMetadata(input),
  ]
}

function webInputMetadata(tool: string, input: Record<string, unknown>) {
  if (tool === "web_search") {
    return [
      item("target", readString(input.query)),
      domainScope(input.includeDomains, "in") ??
        domainScope(input.excludeDomains, "excluding"),
    ]
  }

  return tool === "web_fetch"
    ? [
        item("target", displayUrl(readString(input.url))),
        item("scope", readString(input.highlightQuery)),
      ]
    : []
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

  return tool.includes("add_message")
    ? [item("target", channelLabel(input.channel))]
    : []
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

function resultMetadata(tool: string, result: ToolResult | undefined) {
  if (result === undefined || tool.includes("reaction")) {
    return []
  }

  if (result.kind === "array") {
    return [item("outcome", countText(result.size, noun(tool)))]
  }

  return []
}

function reactionMetadata(
  tool: string,
  input: Record<string, unknown> | undefined
) {
  if (input === undefined || !tool.includes("reaction")) {
    return []
  }

  return [
    item(
      "target",
      reactionDisplayLabel(
        readString(input.reaction) ??
          readString(input.name) ??
          readString(input.content) ??
          readString(input.emoji)
      )
    ),
  ]
}
