import { type RuntimeToolMetadataItem } from "../types"
import {
  arrayCount,
  compactMetadata,
  countText,
  isRecord,
  item,
  nestedArrayCount,
  readNumber,
} from "./helpers"

export function toolResultMetadata(
  tool: string,
  result: unknown
): RuntimeToolMetadataItem[] {
  if (tool === "send_reply" || tool.includes("reaction")) {
    return []
  }

  return compactMetadata([
    ...webResultMetadata(tool, result),
    ...writeResultMetadata(tool, result),
    ...countResultMetadata(tool, result),
  ])
}

function webResultMetadata(tool: string, result: unknown) {
  if (tool !== "web_search" && tool !== "web_fetch") {
    return []
  }

  const count = arrayCount(result, "results")

  return [
    item("outcome", countText(count, tool === "web_fetch" ? "page" : "result")),
  ]
}

function writeResultMetadata(tool: string, result: unknown) {
  if (tool === "github_create_pull_request" && isRecord(result)) {
    return [item("outcome", pullRequestOutcome(result.pullRequest))]
  }

  if (tool === "github_commit_to_pull_request" && isRecord(result)) {
    return [
      item("outcome", countText(arrayCount(result.changes, "files"), "file")),
    ]
  }

  const outcome = writeOutcomeText(tool, result)

  return outcome === undefined ? [] : [item("outcome", outcome)]
}

function countResultMetadata(tool: string, result: unknown) {
  const count = resultCount(result)

  return count === undefined
    ? []
    : [item("outcome", countText(count, noun(tool)))]
}

function writeOutcomeText(tool: string, result: unknown) {
  if (typeof result === "string" && result.trim() !== "") {
    return result.trim()
  }

  if (
    tool.includes("send") ||
    tool.includes("reply_to") ||
    tool.includes("add_message")
  ) {
    return "sent"
  }

  if (tool.includes("create_draft")) {
    return "draft created"
  }

  if (tool.includes("add_comment")) {
    return "comment posted"
  }

  if (tool.includes("create")) {
    return "created"
  }

  if (tool.includes("update")) {
    return "updated"
  }

  return undefined
}

function resultCount(result: unknown) {
  if (Array.isArray(result)) {
    return result.length
  }

  if (!isRecord(result)) {
    return undefined
  }

  return (
    arrayCount(result, "results") ??
    arrayCount(result, "items") ??
    arrayCount(result, "threads") ??
    arrayCount(result, "messages") ??
    arrayCount(result, "files") ??
    arrayCount(result, "comments") ??
    arrayCount(result, "issues") ??
    arrayCount(result, "repositories") ??
    arrayCount(result, "members") ??
    arrayCount(result, "channels") ??
    arrayCount(result, "value") ??
    nestedArrayCount(result, "messages", "matches") ??
    readNumber(result.totalCount) ??
    readNumber(result.resultSizeEstimate)
  )
}

function pullRequestOutcome(value: unknown) {
  if (!isRecord(value)) {
    return undefined
  }

  const number = readNumber(value.number)

  return number === undefined ? "PR created" : `PR #${number}`
}

function noun(tool: string) {
  if (tool.includes("thread")) {
    return "thread"
  }

  if (tool.includes("message")) {
    return "message"
  }

  if (tool.includes("comment")) {
    return "comment"
  }

  if (tool.includes("file")) {
    return "file"
  }

  if (tool.includes("repository")) {
    return "repository"
  }

  if (tool.includes("issue")) {
    return "issue"
  }

  if (tool.includes("event")) {
    return "event"
  }

  return "result"
}
