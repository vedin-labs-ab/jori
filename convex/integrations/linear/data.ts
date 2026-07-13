import { readProviderDataString } from "../connect/response"

export function getLinearBotId(data: unknown) {
  return readProviderDataString(data, "botId")
}
