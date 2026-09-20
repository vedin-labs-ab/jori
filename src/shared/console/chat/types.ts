import { type ChoicesAnswer } from "@contracts/replies/answers"
import { type ReplyPart } from "@contracts/replies/parts"
import { type MessageContext } from "@contracts/replies/references"
import { type Visibility } from "@contracts/visibility"

// What the chat views read. The console maps its rows to these and the
// landing page's demo builds them from fixtures; the views know only
// this much.

export type ChatRole = "person" | "jori"

export type ChatMessage = {
  id: string
  role: ChatRole
  /** The person who sent this message, resolved for the current viewer. */
  author?: { id: string; name: string; image?: string; isViewer: boolean }
  /** Markdown for Jori's messages, plain text for a person's. */
  text: string
  parts: ReplyPart[]
  /** The resources a person's text mentions, as `+[kind:id]` tokens. */
  references?: MessageContext[]
  /** The reply's questions this message answers. */
  answer?: ChoicesAnswer
  createdAt: number
}

export type ChatConversation = {
  id: string
  title: string
  updatedAt: number
  folderId?: string
  visibility: Visibility
  createdBy?: string
}

export type ChatRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "stopped"

export type ChatRun = {
  id: string
  status: ChatRunStatus
  /** Why a failed run failed, as the run recorded it. */
  error?: string
  /** When the run ended, once it has. */
  endedAt?: number
}

/** The turn Jori is writing: the reasoning while the model thinks, then
 *  the reply's text as far as it has come. */
export type ChatDraft = {
  reasoning: string
  text: string
}

/** The latest message of a role: the person's, which the thread anchors
 *  on, or Jori's, whose references a reply may open. */
export function lastMessage(messages: ChatMessage[], role: ChatRole) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]

    if (message?.role === role) {
      return message
    }
  }

  return undefined
}

/** Whether a run is still going, so the thread shows progress and the
 *  composer offers to stop it. */
export function isLiveRun(run: ChatRun | null): run is ChatRun {
  return run !== null && (run.status === "queued" || run.status === "running")
}

/** Whether the run ended without Jori's reply landing: it failed or was
 *  stopped, and no message of Jori's followed its end. A heads-up sent
 *  before the end does not count as the reply. */
export function endedWithoutReply(
  messages: ChatMessage[],
  run: ChatRun | null
): run is ChatRun {
  if (run === null || (run.status !== "failed" && run.status !== "stopped")) {
    return false
  }

  const endedAt = run.endedAt ?? 0

  return !messages.some(
    (message) => message.role === "jori" && message.createdAt > endedAt
  )
}

/** How much of the model's window the thread's latest run is using, the
 *  last turn's breakdown, and whether the run condensed earlier context to
 *  keep going. The composer shows the use as a ring; the thread notes the
 *  condensing. */
export type ChatContextUsage = {
  condensed: boolean
  model: string
  runId: string
  turn: {
    cached: number
    input: number
    output: number
    reasoning: number
  } | null
  usedTokens: number
  windowTokens: number
}
