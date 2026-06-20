import { readProviderDataString } from "../data"

export function getSlackBotId(data: unknown) {
  return readProviderDataString(data, "botId")
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
