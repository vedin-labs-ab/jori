import { promptModel } from "./model"
import { createStateClient } from "./state"
import { type JoriToolName, type ToolMethod } from "./tools"
import { type JoriClient, type RawJoriClient } from "./types"

declare global {
  // biome-ignore lint/style/useConsistentTypeDefinitions: Window augmentation requires interface merging.
  interface Window {
    Jori?: RawJoriClient
  }
}

export function requireJori(): JoriClient {
  const raw = window.Jori

  if (raw === undefined) {
    throw new Error("Jori app SDK is not ready.")
  }

  return createJoriClient(raw)
}

export const jori = createLazyJoriClient()

function createLazyJoriClient(): JoriClient {
  return new Proxy({} as JoriClient, {
    get(_target, property) {
      const client = requireJori()
      const value = Reflect.get(client, property)

      return typeof value === "function" ? value.bind(client) : value
    },
  })
}

function createJoriClient(raw: RawJoriClient): JoriClient {
  const state = createStateClient(raw)
  const prompt: JoriClient["model"]["prompt"] = (input, options) =>
    promptModel(raw.model.prompt, input, options)

  return Object.freeze({
    appId: raw.appId,
    versionId: raw.versionId,
    getToken: raw.getToken,
    callTool: raw.callTool,
    state,
    model: Object.freeze({
      prompt,
    }),
    web: Object.freeze({
      search: toolMethod(raw, "web_search"),
      fetch: toolMethod(raw, "web_fetch"),
    }),
    gmail: Object.freeze({
      searchThreads: toolMethod(raw, "google_gmail_search_threads"),
      getThread: toolMethod(raw, "google_gmail_get_thread"),
      getThreads: toolMethod(raw, "google_gmail_get_threads"),
      getMessage: toolMethod(raw, "google_gmail_get_message"),
      getMessages: toolMethod(raw, "google_gmail_get_messages"),
      replyToThread: toolMethod(raw, "google_gmail_reply_to_thread"),
      sendMessage: toolMethod(raw, "google_gmail_send_message"),
      createDraft: toolMethod(raw, "google_gmail_create_draft"),
    }),
  })
}

function toolMethod<TTool extends JoriToolName>(
  raw: RawJoriClient,
  tool: TTool
): ToolMethod<TTool> {
  return (input, options) => raw.callTool(tool, input, options)
}
