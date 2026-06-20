import { readProviderDataString } from "../data"

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
