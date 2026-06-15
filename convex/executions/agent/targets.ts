import {
  readDataNumber,
  readDataObject,
  readDataString,
} from "../../shared/data"
import { type MessageProvider } from "./codex"
import { type RuntimeTarget } from "./tools"

export function requireMessageTarget(
  provider: MessageProvider,
  data: unknown
): RuntimeTarget {
  if (provider === "github") {
    return requireGitHubTarget(data)
  }

  if (provider === "linear") {
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
    provider: "github",
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
    provider: "linear",
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
    provider: "slack",
    channelId,
  }
}
