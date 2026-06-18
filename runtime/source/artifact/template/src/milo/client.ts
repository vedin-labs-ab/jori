import { promptModel } from "./model"
import { createStateClient } from "./state"
import { type MiloToolName, type ToolMethod } from "./tools"
import { type MiloClient, type RawMiloClient } from "./types"

declare global {
  // biome-ignore lint/style/useConsistentTypeDefinitions: Window augmentation requires interface merging.
  interface Window {
    Milo?: RawMiloClient
  }
}

export function requireMilo(): MiloClient {
  const raw = window.Milo

  if (raw === undefined) {
    throw new Error("Milo artifact SDK is not ready.")
  }

  return createMiloClient(raw)
}

export const milo = createLazyMiloClient()

function createLazyMiloClient(): MiloClient {
  return new Proxy({} as MiloClient, {
    get(_target, property) {
      const client = requireMilo()
      const value = Reflect.get(client, property)

      return typeof value === "function" ? value.bind(client) : value
    },
  })
}

function createMiloClient(raw: RawMiloClient): MiloClient {
  const state = createStateClient(raw)
  const prompt: MiloClient["model"]["prompt"] = (input, options) =>
    promptModel(raw.model.prompt, input, options)

  return Object.freeze({
    artifactId: raw.artifactId,
    versionId: raw.versionId,
    getToken: raw.getToken,
    callTool: raw.callTool,
    state,
    model: Object.freeze({
      prompt,
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

function toolMethod<TTool extends MiloToolName>(
  raw: RawMiloClient,
  tool: TTool
): ToolMethod<TTool> {
  return (input, options) => raw.callTool(tool, input, options)
}
