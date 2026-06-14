import { type Doc } from "../../_generated/dataModel"
import { readDataNumber, readDataObject, readDataString } from "../data"
import { type SourceDatum } from "./source"

export function sourceTarget(input: {
  data: unknown
  event: Doc<"events"> | null
  message: Doc<"messages"> | null
  provider: string | undefined
}): SourceDatum | undefined {
  const providerTarget = providerSourceTarget(input.provider, input.data)

  if (providerTarget !== undefined) {
    return providerTarget
  }

  if (input.event?.resource !== undefined) {
    return {
      type: "resource",
      label: input.event.resource,
    }
  }

  if (input.message?.conversationId !== undefined) {
    return {
      type: "conversation",
      label: input.message.conversationId,
    }
  }
}

export function sourceFacts(provider: string | undefined, data: unknown) {
  if (provider === "github") {
    return githubFacts(data)
  }

  if (provider === "linear") {
    return linearFacts(data)
  }

  if (provider === "notion") {
    return notionFacts(data)
  }

  if (provider === "slack") {
    return slackFacts(data)
  }

  return []
}

function providerSourceTarget(
  provider: string | undefined,
  data: unknown
): SourceDatum | undefined {
  if (provider === "github") {
    return githubTarget(data)
  }

  if (provider === "linear") {
    return linearTarget(data)
  }

  if (provider === "notion") {
    return notionTarget(data)
  }

  if (provider === "slack") {
    return slackTarget(data)
  }
}

function githubTarget(data: unknown): SourceDatum | undefined {
  const repository = readDataObject(data, "repository")
  const issue = readDataObject(data, "issue")
  const pullRequest = readDataObject(data, "pullRequest")
  const repo = readDataString(repository, "fullName")
  const pullNumber =
    readDataNumber(data, "pullNumber") ?? readDataNumber(pullRequest, "number")
  const issueNumber =
    readDataNumber(data, "issueNumber") ?? readDataNumber(issue, "number")
  const number = pullNumber ?? issueNumber
  const target = pullNumber === undefined ? issue : pullRequest
  const url = readDataString(target, "url")
  const title = readDataString(target, "title")

  if (repo === undefined && number === undefined && title === undefined) {
    return undefined
  }

  return {
    type: pullNumber === undefined ? "issue" : "pull_request",
    label: compactText([
      number === undefined ? undefined : `#${number}`,
      repo === undefined ? undefined : `in ${repo}`,
      title,
    ]),
    ...(url === undefined ? {} : { url }),
  }
}

function githubFacts(data: unknown): SourceDatum[] {
  const comment = readDataObject(data, "comment")

  return compactData([
    fact(
      "comment",
      readDataString(comment, "id"),
      readDataString(comment, "url")
    ),
    fact("path", readDataString(comment, "path")),
  ])
}

function linearTarget(data: unknown): SourceDatum | undefined {
  const issue = readDataObject(data, "issue")
  const identifier = readDataString(data, "issueIdentifier")
  const issueId = readDataString(data, "issueId")
  const title = readDataString(issue, "title")
  const url = readDataString(issue, "url")

  if (
    identifier === undefined &&
    issueId === undefined &&
    title === undefined
  ) {
    return undefined
  }

  return {
    type: "issue",
    label: compactText([identifier ?? issueId, title]),
    ...(url === undefined ? {} : { url }),
  }
}

function linearFacts(data: unknown): SourceDatum[] {
  const issue = readDataObject(data, "issue")
  const team = readDataObject(issue, "team")
  const project = readDataObject(issue, "project")

  return compactData([
    fact("team", readDataString(team, "key") ?? readDataString(team, "name")),
    fact("project", readDataString(project, "name")),
    fact(
      "comment",
      readDataString(data, "commentId"),
      readDataString(data, "url")
    ),
  ])
}

function notionTarget(data: unknown): SourceDatum | undefined {
  const pageId = readDataString(data, "pageId")
  const entity = readDataObject(data, "entity")
  const entityId = readDataString(entity, "id")

  if (pageId === undefined && entityId === undefined) {
    return undefined
  }

  return {
    type: "page",
    label: pageId ?? entityId ?? "Notion page",
  }
}

function notionFacts(data: unknown): SourceDatum[] {
  return compactData([
    fact("workspace", readDataString(data, "workspaceName")),
    fact("comment", readDataString(data, "commentId")),
  ])
}

function slackTarget(data: unknown): SourceDatum | undefined {
  const channelId = readDataString(data, "channelId")

  if (channelId === undefined) {
    return undefined
  }

  return {
    type: "channel",
    label: channelId,
  }
}

function slackFacts(data: unknown): SourceDatum[] {
  return compactData([
    fact("message", readDataString(data, "ts")),
    fact("thread", readDataString(data, "threadTs")),
  ])
}

function fact(
  type: string,
  label: string | undefined,
  url?: string
): SourceDatum | undefined {
  if (label === undefined || label === "") {
    return undefined
  }

  return { type, label, ...(url === undefined ? {} : { url }) }
}

function compactData(data: Array<SourceDatum | undefined>) {
  return data.filter((datum): datum is SourceDatum => datum !== undefined)
}

function compactText(parts: Array<string | undefined>) {
  return parts.filter((part) => part !== undefined && part !== "").join(" ")
}
