import { type JsonObject, type MiloToolOptions } from "./types"

export type WebSearchInput = {
  query: string
  limit?: number
  includeDomains?: string[]
  excludeDomains?: string[]
  maxCharacters?: number
}

export type WebFetchInput = {
  url: string
  highlightQuery?: string
  maxCharacters?: number
}

export type WebProviderTrace = {
  name: "exa"
  operation: "contents" | "search"
  requestId: string
  resolvedSearchType?: string
  searchTimeMs?: number
  statuses?: Array<{
    id: string
    source: string
    status: string
  }>
}

export type WebResult = {
  url: string
  title: string | null
  source: {
    provider: "exa"
    id: string
    author?: string
    faviconUrl?: string
    imageUrl?: string
    publishedAt?: string
    score?: number
  }
  snippet: string | null
  highlights: string[]
  content: {
    text: string | null
    characters: number
    truncated: boolean
  }
}

export type WebToolResult = {
  provider: WebProviderTrace
  results: WebResult[]
  truncated: boolean
}

export type GmailFormat = "full" | "metadata" | "minimal"
export type GmailHeader = JsonObject & { name?: string; value?: string }
export type GmailPayload = JsonObject & { headers?: GmailHeader[] }
export type GmailMessage = JsonObject & {
  id?: string
  threadId?: string
  labelIds?: string[]
  snippet?: string
  internalDate?: string
  payload?: GmailPayload
}
export type GmailThread = JsonObject & {
  id?: string
  historyId?: string
  messages?: GmailMessage[]
  snippet?: string
}
export type GmailThreadSearchResult = JsonObject & {
  nextPageToken?: string
  resultSizeEstimate?: number
  threads?: GmailThread[]
}
export type GmailDraftResult = JsonObject & {
  id?: string
  message?: GmailMessage
}

export type GmailMessageWriteInput = {
  to: string[]
  subject: string
  body: string
  attachments?: Array<{
    attachmentId: string
    name?: string
    mimeType?: string
  }>
  bcc?: string[]
  bodyType?: "Text" | "HTML"
  cc?: string[]
}

export type GmailDraftInput = {
  body: string
  threadId?: string
  to?: string[]
  subject?: string
  attachments?: Array<{
    attachmentId: string
    name?: string
    mimeType?: string
  }>
  bcc?: string[]
  bodyType?: "Text" | "HTML"
  cc?: string[]
}

export type MiloToolInputs = {
  web_search: WebSearchInput
  web_fetch: WebFetchInput
  google_gmail_search_threads: { q?: string; maxResults?: number }
  google_gmail_get_thread: { threadId: string; format?: GmailFormat }
  google_gmail_get_threads: { threadIds: string[]; format?: GmailFormat }
  google_gmail_get_message: { messageId: string; format?: GmailFormat }
  google_gmail_get_messages: { messageIds: string[]; format?: GmailFormat }
  google_gmail_reply_to_thread: { threadId: string; body: string }
  google_gmail_send_message: GmailMessageWriteInput
  google_gmail_create_draft: GmailDraftInput
}

export type MiloToolResults = {
  web_search: WebToolResult
  web_fetch: WebToolResult
  google_gmail_search_threads: GmailThreadSearchResult
  google_gmail_get_thread: GmailThread
  google_gmail_get_threads: GmailThread[]
  google_gmail_get_message: GmailMessage
  google_gmail_get_messages: GmailMessage[]
  google_gmail_reply_to_thread: GmailMessage
  google_gmail_send_message: GmailMessage
  google_gmail_create_draft: GmailDraftResult
}

export type MiloToolName = keyof MiloToolInputs

export type MiloToolCaller = {
  <TTool extends MiloToolName>(
    tool: TTool,
    args: MiloToolInputs[TTool],
    options?: MiloToolOptions
  ): Promise<MiloToolResults[TTool]>
  <T = unknown>(
    tool: string,
    args?: unknown,
    options?: MiloToolOptions
  ): Promise<T>
}

export type ToolMethod<TTool extends MiloToolName> = (
  input: MiloToolInputs[TTool],
  options?: MiloToolOptions
) => Promise<MiloToolResults[TTool]>
