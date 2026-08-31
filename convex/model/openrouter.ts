import { OpenRouter } from "@openrouter/sdk"
import {
  type ChatMessages,
  type ChatRequest,
  type ChatResult,
} from "@openrouter/sdk/models"
import {
  readEnvironmentVariable,
  requireEnvironmentVariable,
} from "../shared/environment"

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
  OpenRouterModelSelection & {
    stream?: false
  }

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

export async function sendOpenRouterChat(
  input: OpenRouterChatInput
): Promise<ChatResult> {
  const result = await openRouterClient().chat.send({
    chatRequest: {
      ...input,
      stream: false,
    },
  })

  if ("choices" in result) {
    return result
  }

  throw new Error("OpenRouter returned a stream for a non-streaming request")
}
