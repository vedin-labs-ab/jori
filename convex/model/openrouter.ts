import { OpenRouterCore } from "@openrouter/sdk/core"
import { chatSend } from "@openrouter/sdk/funcs/chatSend"
import {
  type ChatMessages,
  type ChatRequest,
  type ChatResult,
  type ChatStreamChunk,
  type ProviderPreferences,
} from "@openrouter/sdk/models"
import { requireOpenRouterConfig } from "./connection"
import { requireEligibleModels } from "./eligibility"
import { withSupportedTokenBudget } from "./request"
import { type ChatDelta, foldChatStream } from "./stream"

type OpenRouterModelSelection =
  | {
      model: string
      models?: never
    }
  | {
      model?: never
      models: [string, ...string[]]
    }

type OpenRouterChatInput = Omit<ChatRequest, "model" | "models" | "stream"> &
  OpenRouterModelSelection

export type OpenRouterChatMessage = ChatMessages

// The SDK's root client evaluates every model schema it knows on import,
// more than a loop step's memory can hold beside the loop itself. The core
// client with the one standalone function loads the chat schemas alone.

/** The regional endpoint enforces location, including provider fallbacks. */
export function providerPreferences(): ProviderPreferences {
  return { requireParameters: true, dataCollection: "deny", zdr: true }
}

function openRouterClient() {
  return new OpenRouterCore(requireOpenRouterConfig())
}

/** The standalone function answers a result instead of throwing; the SDK's
 *  own error is thrown here, as the root client's method would have. */
async function send(chatRequest: ChatRequest) {
  const result = await chatSend(openRouterClient(), {
    chatRequest: {
      ...chatRequest,
      provider: { ...chatRequest.provider, ...providerPreferences() },
    },
  })

  if (!result.ok) {
    throw result.error
  }

  return result.value
}

/**
 * One completion, streamed and folded into the result a plain call returns,
 * with each chunk offered to `onDelta` on the way. A provider that answers
 * a stream request with a whole result is taken as is; one that cannot open
 * a stream at all is asked once more without it, so streaming support never
 * decides whether a run gets its answer.
 */
export async function sendOpenRouterChat(
  input: OpenRouterChatInput,
  onDelta?: (delta: ChatDelta) => void
): Promise<ChatResult> {
  const eligible = await requireEligibleModels(
    input.model === undefined ? input.models : [input.model]
  )
  const request = withSupportedTokenBudget(input, eligible)
  let received = false

  try {
    const result = await send({ ...request, stream: true })

    if ("choices" in result) {
      return result
    }

    return await foldChatStream(
      observeChunks(result, () => {
        received = true
      }),
      onDelta
    )
  } catch (error) {
    if (received) {
      throw error
    }
  }

  const result = await send({ ...request, stream: false })

  if ("choices" in result) {
    return result
  }

  throw new Error("OpenRouter returned a stream for a non-streaming request")
}

async function* observeChunks(
  chunks: AsyncIterable<ChatStreamChunk>,
  onChunk: () => void
) {
  for await (const chunk of chunks) {
    onChunk()
    yield chunk
  }
}
