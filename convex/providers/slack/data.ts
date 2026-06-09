import { readProviderDataObject, readProviderDataString } from "../data"

export function getSlackBotId(data: unknown) {
  return readProviderDataString(data, "botId")
}

export function getSlackTeamName(data: unknown) {
  const team = readProviderDataObject(data, "team")

  return readProviderDataString(team, "name")
}

export function getSlackChannelType(data: unknown) {
  return readProviderDataString(data, "channelType")
}
