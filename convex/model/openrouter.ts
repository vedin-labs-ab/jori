import { OpenRouter } from "@openrouter/sdk"
import {
  type ChatMessages,
  type ChatRequest,
  type ChatResult,
} from "@openrouter/sdk/models"

const defaultOpenRouterAppTitle = "Milo"
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

export type OpenRouterConfig = {
  apiKey: string
  appCategories?: string
  appTitle?: string
  httpReferer?: string
}

export type OpenRouterChatInput = Omit<
  ChatRequest,
  "model" | "models" | "stream"
> &
  OpenRouterModelSelection & {
    stream?: false
  }

export type OpenRouterChatMessage = ChatMessages

let cachedClient: OpenRouter | undefined

export function requireOpenRouterConfig(): OpenRouterConfig {
  const apiKey = readEnvironmentVariable("OPENROUTER_API_KEY")

  if (apiKey === undefined) {
    throw new Error("Missing OPENROUTER_API_KEY")
  }

  return {
    apiKey,
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

export function createOpenRouterClient(config = requireOpenRouterConfig()) {
  return new OpenRouter(config)
}

export function getOpenRouterClient() {
  cachedClient ??= createOpenRouterClient()
  return cachedClient
}

export async function sendOpenRouterChat(
  input: OpenRouterChatInput
): Promise<ChatResult> {
  return await getOpenRouterClient().chat.send({
    chatRequest: {
      ...input,
      stream: false,
    },
  })
}

function readEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim()
  return value === "" ? undefined : value
}
