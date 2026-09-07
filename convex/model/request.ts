import { type ChatRequest, type Model } from "@openrouter/sdk/models"

/** Callers declare an output budget. The adapter chooses the spelling all
 * eligible candidates support, without dropping the budget or weakening the
 * provider's require_parameters check. */
export function withSupportedTokenBudget(
  request: ChatRequest,
  models: readonly Pick<Model, "supportedParameters">[]
): ChatRequest {
  const limit = request.maxCompletionTokens ?? request.maxTokens
  if (limit === undefined || limit === null) {
    return request
  }
  if (
    request.maxTokens != null &&
    request.maxCompletionTokens != null &&
    request.maxTokens !== request.maxCompletionTokens
  ) {
    throw new Error("Specify one output token budget")
  }
  if (
    models.every((model) =>
      model.supportedParameters.includes("max_completion_tokens")
    )
  ) {
    return { ...request, maxTokens: undefined, maxCompletionTokens: limit }
  }
  if (
    models.every((model) => model.supportedParameters.includes("max_tokens"))
  ) {
    return { ...request, maxTokens: limit, maxCompletionTokens: undefined }
  }
  throw new Error(
    "The selected models do not share a supported output token limit"
  )
}
