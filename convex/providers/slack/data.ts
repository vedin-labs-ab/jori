import { readProviderDataString } from "../data"

export function getSlackBotId(data: unknown) {
  return readProviderDataString(data, "botId")
}

export function getSlackChannelType(data: unknown) {
  return readProviderDataString(data, "channelType")
}

export function getSlackChannelId(data: unknown) {
  return readProviderDataString(data, "channelId")
}
