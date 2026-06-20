import { type RuntimeToolTraceData } from "./types"

export function providerTrace(
  result: unknown
): Pick<RuntimeToolTraceData, "providerTrace"> {
  if (
    typeof result !== "object" ||
    result === null ||
    !("provider" in result)
  ) {
    return {}
  }

  const provider = result.provider

  if (
    typeof provider !== "object" ||
    provider === null ||
    !("name" in provider) ||
    !("requestId" in provider) ||
    typeof provider.name !== "string" ||
    typeof provider.requestId !== "string"
  ) {
    return {}
  }

  return {
    providerTrace: {
      provider: provider.name,
      requestId: provider.requestId,
    },
  }
}
