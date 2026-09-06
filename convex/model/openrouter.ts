import { OpenRouter } from "@openrouter/sdk"
import {
  type ChatMessages,
  type ChatRequest,
  type ChatResult,
  type ChatStreamChunk,
} from "@openrouter/sdk/models"
import {
  readEnvironmentVariable,
  requireEnvironmentVariable,
} from "../shared/environment"
import { type ChatDelta, foldChatStream } from "./stream"

const defaultOpenRouterAppTitle = "Jori"
const defaultOpenRouterAppCategories = "cloud-agent"

type OpenRouterModelSelection =
  | {
      model: string
      models?: never
    }
  | {
      model?: never
      models: [string, ...string[]]
    }

type OpenRouterConfig = {
  apiKey: string
  appCategories?: string
  appTitle?: string
  httpReferer?: string
}

type OpenRouterChatInput = Omit<ChatRequest, "model" | "models" | "stream"> &
  OpenRouterModelSelection

export type OpenRouterChatMessage = ChatMessages

let cachedClient: OpenRouter | undefined

export function requireOpenRouterConfig(): OpenRouterConfig {
  return {
    apiKey: requireEnvironmentVariable("OPENROUTER_API_KEY"),
    appCategories:
      readEnvironmentVariable("OPENROUTER_APP_CATEGORIES") ??
      defaultOpenRouterAppCategories,
    appTitle:
      readEnvironmentVariable("OPENROUTER_APP_TITLE") ??
      defaultOpenRouterAppTitle,
    httpReferer:
      readEnvironmentVariable("OPENROUTER_HTTP_REFERER") ??
      readEnvironmentVariable("CONVEX_SITE_URL"),
  }
}

function openRouterClient() {
  cachedClient ??= new OpenRouter(requireOpenRouterConfig())

  return cachedClient
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
  let received = false

  try {
    const result = await openRouterClient().chat.send({
      chatRequest: { ...input, stream: true },
    })

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

  const result = await openRouterClient().chat.send({
    chatRequest: { ...input, stream: false },
  })

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
