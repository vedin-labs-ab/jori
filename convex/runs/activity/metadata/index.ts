import { isRecord } from "../../../../contracts/json"
import { reactionDisplayLabel } from "../../../../contracts/reactions"
import { type Doc } from "../../../_generated/dataModel"
import { optionalString } from "../../../shared/input"
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
  readStringArray,
  repositoryLabel,
  targetObjectLabel,
} from "../helpers"
import { type ToolResult } from "../read"
import { agentWaitMetadata } from "./agents"
import { materialMetadata } from "./materials"
import { runIntrospectionMetadata } from "./runs"

export function toolMetadata(args: {
  agents: Doc<"runs">[]
  input: Record<string, unknown> | undefined
  materialNames: ReadonlyMap<string, string>
  result: ToolResult | undefined
  tool: string
}) {
  if (args.tool === "send_reply") {
    return []
  }

  const agentMetadata = agentWaitMetadata(args.tool, args.input, args.agents)

  if (agentMetadata.length > 0) {
    return compactMetadata(agentMetadata)
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
    ...materialMetadata(args),
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
      item("target", optionalString(input.query)),
      domainScope(input.includeDomains, "in") ??
        domainScope(input.excludeDomains, "excluding"),
    ]
  }

  return tool === "web_fetch"
    ? [
        item("target", displayUrl(optionalString(input.url))),
        item("scope", optionalString(input.highlightQuery)),
      ]
    : []
}

function codeInputMetadata(tool: string, input: Record<string, unknown>) {
  switch (tool) {
    case "bash":
      return [item("target", optionalString(input.command))]
    case "git":
      return [item("target", readStringArray(input.args)?.join(" "))]
    case "glob":
    case "grep":
      return [
        item("target", optionalString(input.pattern)),
        item(
          "scope",
          optionalString(input.path) ?? optionalString(input.include)
        ),
      ]
    case "github_clone_repository":
      return [
        item("target", repositoryLabel(input)),
        item(
          "scope",
          optionalString(input.ref) ?? optionalString(input.directory)
        ),
      ]
    case "read":
      return [item("target", optionalString(input.path))]
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
        optionalString(input.query)
    ),
    item("scope", optionalString(input.state)),
  ]
}

function messageInputMetadata(tool: string, input: Record<string, unknown>) {
  if (tool.includes("search")) {
    return [
      item("target", optionalString(input.query) ?? optionalString(input.q)),
    ]
  }

  if (tool.includes("send") || tool.includes("draft")) {
    return [
      item("target", optionalString(input.subject)),
      item("scope", countText(arrayLength(input.to), "recipient")),
    ]
  }

  if (tool.includes("reply")) {
    return [item("target", optionalString(input.threadId))]
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
        optionalString(input.event.summary) ??
          optionalString(input.event.subject)
      ),
      item("scope", countText(arrayLength(input.event.attendees), "attendee")),
    ]
  }

  return [
    item(
      "target",
      targetObjectLabel(input.target) ??
        optionalString(input.title) ??
        optionalString(input.name) ??
        optionalString(input.pageId) ??
        optionalString(input.fileId) ??
        optionalString(input.issueId) ??
        optionalString(input.eventId)
    ),
  ]
}

function genericInputMetadata(input: Record<string, unknown>) {
  return [
    item(
      "target",
      optionalString(input.query) ??
        optionalString(input.q) ??
        displayUrl(optionalString(input.url)) ??
        optionalString(input.path)
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
        optionalString(input.reaction) ??
          optionalString(input.name) ??
          optionalString(input.content) ??
          optionalString(input.emoji)
      )
    ),
  ]
}
