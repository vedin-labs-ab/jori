import { type z } from "zod"
import {
  type MiloPromptInput,
  type MiloPromptResult,
  type RawPromptInput,
} from "./model/types"
import {
  type MiloStateClient,
  type MiloStateDocument,
  type RawMiloStateListInput,
  type RawMiloStateReadInput,
  type RawMiloStateUpdateInput,
} from "./state/types"
import { type MiloToolCaller, type ToolMethod } from "./tools"

export type MiloToolOptions = {
  cacheTtlMs?: number
  forceRefresh?: boolean
  integrationId?: string
}

export type RawMiloClient = Readonly<{
  appId: string
  versionId: string
  getToken: () => string
  callTool: MiloToolCaller
  state: Readonly<{
    read: <T = unknown>(
      input: RawMiloStateReadInput
    ) => Promise<MiloStateDocument<T> | null>
    list: <T = unknown>(
      input?: RawMiloStateListInput
    ) => Promise<MiloStateDocument<T>[]>
    update: <T = unknown>(
      input: RawMiloStateUpdateInput
    ) => Promise<MiloStateDocument<T>>
  }>
  model: Readonly<{
    prompt: <T = unknown>(
      input: RawPromptInput,
      options?: MiloToolOptions
    ) => Promise<T>
  }>
}>

export type MiloClient = Readonly<{
  appId: string
  versionId: string
  getToken: () => string
  callTool: MiloToolCaller
  state: MiloStateClient
  model: Readonly<{
    prompt: <TSchema extends z.ZodType>(
      input: MiloPromptInput<TSchema>,
      options?: MiloToolOptions
    ) => Promise<MiloPromptResult<z.output<TSchema>>>
  }>
  web: Readonly<{
    search: ToolMethod<"web_search">
    fetch: ToolMethod<"web_fetch">
  }>
  gmail: Readonly<{
    searchThreads: ToolMethod<"google_gmail_search_threads">
    getThread: ToolMethod<"google_gmail_get_thread">
    getThreads: ToolMethod<"google_gmail_get_threads">
    getMessage: ToolMethod<"google_gmail_get_message">
    getMessages: ToolMethod<"google_gmail_get_messages">
    replyToThread: ToolMethod<"google_gmail_reply_to_thread">
    sendMessage: ToolMethod<"google_gmail_send_message">
    createDraft: ToolMethod<"google_gmail_create_draft">
  }>
}>

export type { JsonObject } from "./json"
export type {
  MiloPromptDiagnostics,
  MiloPromptInput,
  MiloPromptResult,
  RawPromptInput,
  RawPromptResult,
} from "./model/types"
export type {
  AppContract,
  AppContractJson,
  AppStateContractJson,
  AppStateDefinition,
  AppStateRef,
  MiloStateClient,
  MiloStateDocument,
  MiloStateHookInput,
  MiloStateHookResult,
  MiloStatePatch,
  MiloStatePatchInput,
  MiloStateReplaceInput,
  MiloStateScope,
  MiloStateStatus,
  MiloStateSubscriptionInput,
  MiloStateWriteOptions,
  RawMiloStateListInput,
  RawMiloStateReadInput,
  RawMiloStateUpdateInput,
} from "./state/types"
