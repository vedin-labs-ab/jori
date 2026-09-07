import { OpenRouterCore } from "@openrouter/sdk/core"
import { chatSend } from "@openrouter/sdk/funcs/chatSend"
import {
  type ChatMessages,
  type ChatRequest,
  type ChatResult,
  type ChatStreamChunk,
  type ProviderPreferences,
} from "@openrouter/sdk/models"
import { isRegion, type Region } from "../../contracts/region"
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

// The SDK's root client evaluates every model schema it knows on import,
// more than a loop step's memory can hold beside the loop itself. The core
// client with the one standalone function loads the chat schemas alone.
let cachedClient: OpenRouterCore | undefined

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

/**
 * How OpenRouter routes Jori's requests, derived from the region this
 * deployment serves. Providers that silently drop tool definitions cannot
 * run the loop, so parameters are required of every provider. Region
 * pinning plugs in here: once inference routes through the region's own
 * endpoint (OpenRouter's business tier), the region decides the provider
 * `order` and `only` lists, and nothing else in a request has to know.
 */
export function providerPreferences(): ProviderPreferences {
  return { requireParameters: true, ...regionPreferences(deploymentRegion()) }
}

function regionPreferences(_region: Region | null): ProviderPreferences {
  return {}
}

function deploymentRegion() {
  const region =
    readEnvironmentVariable("JORI_REGION") ??
    readEnvironmentVariable("VITE_JORI_REGION")

  return isRegion(region) ? region : null
}

function openRouterClient() {
  cachedClient ??= new OpenRouterCore(requireOpenRouterConfig())

  return cachedClient
}

/** The standalone function answers a result instead of throwing; the SDK's
 *  own error is thrown here, as the root client's method would have. */
async function send(chatRequest: ChatRequest) {
  const result = await chatSend(openRouterClient(), { chatRequest })

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
  let received = false

  try {
    const result = await send({ ...input, stream: true })

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

  const result = await send({ ...input, stream: false })

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
