import {
  readDataNumber,
  readDataObject,
  readDataString,
} from "../../shared/data"
import { type MessageIntegration } from "./input"
import { type RuntimeTarget } from "./tools"

export function requireMessageTarget(
  integration: MessageIntegration,
  data: unknown
): RuntimeTarget {
  if (integration === "github") {
    return requireGitHubTarget(data)
  }

  if (integration === "linear") {
    return requireLinearTarget(data)
  }

  return requireSlackTarget(data)
}

function requireGitHubTarget(data: unknown): RuntimeTarget {
  const repository = readDataObject(data, "repository")
  const owner = readDataString(repository, "owner")
  const repo = readDataString(repository, "name")
  const comment = readDataObject(data, "comment")
  const commentId = readDataString(comment, "id")
  const commentKind = readDataString(comment, "kind")

  if (
    owner === undefined ||
    owner === "" ||
    repo === undefined ||
    repo === "" ||
    commentId === undefined ||
    commentId === "" ||
    commentKind === undefined ||
    commentKind === ""
  ) {
    throw new Error("Missing GitHub comment target")
  }

  return {
    integration: "github",
    owner,
    repo,
    repositoryId: readDataNumber(repository, "id"),
    issueNumber: readDataNumber(data, "issueNumber"),
    pullNumber: readDataNumber(data, "pullNumber"),
    commentId,
    commentKind,
  }
}

function requireLinearTarget(data: unknown): RuntimeTarget {
  const issueId = readDataString(data, "issueId")

  if (issueId === undefined || issueId === "") {
    throw new Error("Missing Linear issue target")
  }

  return {
    integration: "linear",
    issueId,
    commentId: readDataString(data, "commentId"),
  }
}

function requireSlackTarget(data: unknown): RuntimeTarget {
  const channelId = readDataString(data, "channelId")

  if (channelId === undefined || channelId === "") {
    throw new Error("Missing Slack channel target")
  }

  return {
    integration: "slack",
    channelId,
  }
}
