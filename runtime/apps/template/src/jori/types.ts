import { type z } from "zod"
import {
  type JoriPromptInput,
  type JoriPromptResult,
  type RawPromptInput,
} from "./model/types"
import {
  type JoriStateClient,
  type JoriStateDocument,
  type RawJoriStateListInput,
  type RawJoriStateReadInput,
  type RawJoriStateUpdateInput,
} from "./state/types"
import { type JoriToolCaller, type ToolMethod } from "./tools"

export type JoriToolOptions = {
  cacheTtlMs?: number
  forceRefresh?: boolean
  integrationId?: string
}

export type RawJoriClient = Readonly<{
  appId: string
  versionId: string
  getToken: () => string
  callTool: JoriToolCaller
  state: Readonly<{
    read: <T = unknown>(
      input: RawJoriStateReadInput
    ) => Promise<JoriStateDocument<T> | null>
    list: <T = unknown>(
      input?: RawJoriStateListInput
    ) => Promise<JoriStateDocument<T>[]>
    update: <T = unknown>(
      input: RawJoriStateUpdateInput
    ) => Promise<JoriStateDocument<T>>
  }>
  model: Readonly<{
    prompt: <T = unknown>(
      input: RawPromptInput,
      options?: JoriToolOptions
    ) => Promise<T>
  }>
}>

export type JoriClient = Readonly<{
  appId: string
  versionId: string
  getToken: () => string
  callTool: JoriToolCaller
  state: JoriStateClient
  model: Readonly<{
    prompt: <TSchema extends z.ZodType>(
      input: JoriPromptInput<TSchema>,
      options?: JoriToolOptions
    ) => Promise<JoriPromptResult<z.output<TSchema>>>
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
  JoriPromptDiagnostics,
  JoriPromptInput,
  JoriPromptResult,
  RawPromptInput,
  RawPromptResult,
} from "./model/types"
export type {
  AppContract,
  AppContractJson,
  AppStateContractJson,
  AppStateDefinition,
  AppStateRef,
  JoriStateClient,
  JoriStateDocument,
  JoriStateHookInput,
  JoriStateHookResult,
  JoriStatePatch,
  JoriStatePatchInput,
  JoriStateReplaceInput,
  JoriStateScope,
  JoriStateStatus,
  JoriStateSubscriptionInput,
  JoriStateWriteOptions,
  RawJoriStateListInput,
  RawJoriStateReadInput,
  RawJoriStateUpdateInput,
} from "./state/types"
