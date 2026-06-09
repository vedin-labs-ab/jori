import { type RuntimeTarget } from "./tools"

export function requireMessageTarget(
  provider: "linear" | "microsoft" | "slack",
  data: unknown
): RuntimeTarget {
  if (provider === "linear") {
    return requireLinearTarget(data)
  }

  if (provider === "microsoft") {
    return requireMicrosoftTarget(data)
  }

  return requireSlackTarget(data)
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
