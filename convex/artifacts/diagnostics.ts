export type ArtifactPromptDiagnostics = {
  durationMs: number
  generationId: string
  model: string
  provider?: ArtifactPromptProviderDiagnostics
  request: ArtifactPromptRequestDiagnostics
  serviceTier?: string | null
  usage?: ArtifactPromptUsageDiagnostics
}

type ArtifactPromptProviderDiagnostics = {
  attempt: number
  availableEndpoints: number
  region: string | null
  requested: string
  selectedModel?: string
  selectedProvider?: string
  strategy: string
  summary: string
}

export type ArtifactPromptRequestDiagnostics = {
  maxOutputTokens: number
  messageBytes: number
  reasoningEffort: "none"
  responseFormat: "json_schema"
  schemaBytes: number
}

type ArtifactPromptUsageDiagnostics = {
  completionTokens?: number
  promptTokens?: number
  reasoningTokens?: number
  totalTokens?: number
}

type ArtifactPromptResponse = {
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
    promptTokens?: number
    totalTokens?: number
  }
}

export function createArtifactPromptDiagnostics(
  response: ArtifactPromptResponse,
  durationMs: number,
  request: ArtifactPromptRequestDiagnostics
): ArtifactPromptDiagnostics {
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
  metadata: ArtifactPromptResponse["openrouterMetadata"]
): ArtifactPromptProviderDiagnostics | undefined {
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
  usage: ArtifactPromptResponse["usage"]
): ArtifactPromptUsageDiagnostics | undefined {
  if (usage === undefined) {
    return undefined
  }

  return {
    completionTokens: usage.completionTokens,
    promptTokens: usage.promptTokens,
    reasoningTokens:
      usage.completionTokensDetails?.reasoningTokens ?? undefined,
    totalTokens: usage.totalTokens,
  }
}
