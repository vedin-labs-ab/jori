export type AppPromptDiagnostics = {
  durationMs: number
  generationId: string
  model: string
  provider?: AppPromptProviderDiagnostics
  request: AppPromptRequestDiagnostics
  serviceTier?: string | null
  usage?: AppPromptUsageDiagnostics
}

type AppPromptProviderDiagnostics = {
  attempt: number
  availableEndpoints: number
  region: string | null
  requested: string
  selectedModel?: string
  selectedProvider?: string
  strategy: string
  summary: string
}

export type AppPromptRequestDiagnostics = {
  maxOutputTokens: number
  messageBytes: number
  reasoningEffort: "none" | "low" | "medium" | "high"
  responseFormat: "json_schema"
  schemaBytes: number
}

type AppPromptUsageDiagnostics = {
  completionTokens?: number
  promptCacheReadTokens?: number
  promptCacheWriteTokens?: number
  promptTokens?: number
  promptUncachedTokens?: number
  reasoningTokens?: number
  totalTokens?: number
}

type AppPromptResponse = {
  id: string
  model: string
  openrouterMetadata?: {
    attempt: number
    endpoints: {
      available: Array<{
        model: string
        provider: string
        selected: boolean
      }>
      total: number
    }
    region: string | null
    requested: string
    strategy: string
    summary: string
  }
  serviceTier?: string | null
  usage?: {
    completionTokens?: number
    completionTokensDetails?: {
      reasoningTokens?: number | null
    } | null
    promptTokensDetails?: {
      cachedTokens?: number
      cacheWriteTokens?: number
    } | null
    promptTokens?: number
    totalTokens?: number
  }
}

export function createAppPromptDiagnostics(
  response: AppPromptResponse,
  durationMs: number,
  request: AppPromptRequestDiagnostics
): AppPromptDiagnostics {
  return {
    durationMs: Math.max(0, Math.trunc(durationMs)),
    generationId: response.id,
    model: response.model,
    provider: providerDiagnostics(response.openrouterMetadata),
    request,
    serviceTier: response.serviceTier,
    usage: usageDiagnostics(response.usage),
  }
}

function providerDiagnostics(
  metadata: AppPromptResponse["openrouterMetadata"]
): AppPromptProviderDiagnostics | undefined {
  if (metadata === undefined) {
    return undefined
  }

  const selected = metadata.endpoints.available.find(
    (endpoint) => endpoint.selected
  )

  return {
    attempt: metadata.attempt,
    availableEndpoints: metadata.endpoints.total,
    region: metadata.region,
    requested: metadata.requested,
    selectedModel: selected?.model,
    selectedProvider: selected?.provider,
    strategy: metadata.strategy,
    summary: metadata.summary,
  }
}

function usageDiagnostics(
  usage: AppPromptResponse["usage"]
): AppPromptUsageDiagnostics | undefined {
  if (usage === undefined) {
    return undefined
  }

  const promptCacheReadTokens = usage.promptTokensDetails?.cachedTokens

  return {
    completionTokens: usage.completionTokens,
    promptCacheReadTokens,
    promptCacheWriteTokens: usage.promptTokensDetails?.cacheWriteTokens,
    promptTokens: usage.promptTokens,
    promptUncachedTokens: promptUncachedTokens(
      usage.promptTokens,
      promptCacheReadTokens
    ),
    reasoningTokens:
      usage.completionTokensDetails?.reasoningTokens ?? undefined,
    totalTokens: usage.totalTokens,
  }
}

function promptUncachedTokens(
  promptTokens: number | undefined,
  promptCacheReadTokens: number | undefined
) {
  return promptTokens === undefined || promptCacheReadTokens === undefined
    ? undefined
    : Math.max(0, promptTokens - promptCacheReadTokens)
}
