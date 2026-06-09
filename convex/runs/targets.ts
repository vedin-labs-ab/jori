import { type RuntimeTarget } from "./tools"

export function requireMessageTarget(
  provider: "github" | "linear" | "microsoft" | "slack",
  data: unknown
): RuntimeTarget {
  if (provider === "github") {
    return requireGitHubTarget(data)
  }

  if (provider === "linear") {
    return requireLinearTarget(data)
  }

  if (provider === "microsoft") {
    return requireMicrosoftTarget(data)
  }

  return requireSlackTarget(data)
}

function requireGitHubTarget(data: unknown): RuntimeTarget {
  const repository = getDataObject(data, "repository")
  const owner = getDataString(repository, "owner")
  const repo = getDataString(repository, "name")
  const comment = getDataObject(data, "comment")
  const commentId = getDataString(comment, "id")
  const commentKind = getDataString(comment, "kind")

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
    repositoryId: getDataNumber(repository, "id"),
    issueNumber: getDataNumber(data, "issueNumber"),
    pullNumber: getDataNumber(data, "pullNumber"),
    commentId,
    commentKind,
  }
}

function requireLinearTarget(data: unknown): RuntimeTarget {
  const issueId = getDataString(data, "issueId")

  if (issueId === undefined || issueId === "") {
    throw new Error("Missing Linear issue target")
  }

  return {
    provider: "linear",
    issueId,
    commentId: getDataString(data, "commentId"),
  }
}

function requireSlackTarget(data: unknown): RuntimeTarget {
  const channelId = getDataString(data, "channelId")

  if (channelId === undefined || channelId === "") {
    throw new Error("Missing Slack channel target")
  }

  return {
    provider: "slack",
    channelId,
  }
}

function requireMicrosoftTarget(data: unknown): RuntimeTarget {
  const chatId = getDataString(data, "chatId")
  const teamId = getDataString(data, "teamId")
  const channelId = getDataString(data, "channelId")
  const messageId = getDataString(data, "messageId")

  if (chatId !== undefined && chatId !== "") {
    return {
      provider: "microsoft",
      chatId,
      messageId,
    }
  }

  if (
    teamId !== undefined &&
    teamId !== "" &&
    channelId !== undefined &&
    channelId !== "" &&
    messageId !== undefined &&
    messageId !== ""
  ) {
    return {
      provider: "microsoft",
      teamId,
      channelId,
      messageId,
      replyId: getDataString(data, "replyId"),
    }
  }

  throw new Error("Missing Microsoft Teams target")
}

function getDataString(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "string" ? value : undefined
}

function getDataNumber(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "number" ? value : undefined
}

function getDataObject(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "object" && value !== null ? value : undefined
}
