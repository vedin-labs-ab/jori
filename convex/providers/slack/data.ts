import { readProviderDataString } from "../data"

export type SlackChannelType = "channel" | "group" | "im" | "mpim" | "unknown"

export function getSlackBotUserId(data: unknown) {
  return readProviderDataString(data, "botUserId")
}

export function getSlackChannelId(data: unknown) {
  return readProviderDataString(data, "channel", "id")
}

export function getSlackMessageTs(data: unknown) {
  return readProviderDataString(data, "ts")
}

export function getSlackThreadTs(data: unknown) {
  return readProviderDataString(data, "thread", "ts")
}

export function getSlackChannelType(type: string): SlackChannelType {
  switch (type) {
    case "message.channels":
      return "channel"
    case "message.groups":
      return "group"
    case "message.im":
      return "im"
    case "message.mpim":
      return "mpim"
    default:
      return "unknown"
  }
}
