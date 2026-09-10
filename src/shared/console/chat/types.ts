import {
  type ChoicesAnswer,
  type MessageContext,
} from "@contracts/replies/answers"
import { type ReferenceKind, type ReplyPart } from "@contracts/replies/parts"

// What the chat views read. The console maps its rows to these and the
// landing page's demo builds them from fixtures; the views know only
// this much.

export type ChatRole = "person" | "jori"

export type ChatMessage = {
  id: string
  role: ChatRole
  /** Markdown for Jori's messages, plain text for a person's. */
  text: string
  parts: ReplyPart[]
  /** The resource or folder the person opened the chat about. */
  context?: MessageContext
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

/** What a reference part or a message's context points at. */
export type ReferenceTarget = {
  kind: ReferenceKind
  id: string
}

/** One string per target — `kind:id`, as a resource token carries it —
 *  for keys, tab values, and mention ids. */
export function targetKey(target: ReferenceTarget) {
  return `${target.kind}:${target.id}`
}

export function isSameTarget(left: ReferenceTarget, right: ReferenceTarget) {
  return left.kind === right.kind && left.id === right.id
}

/** A target as the host resolved it, for the card that shows it. */
export type ChatReference = {
  kind: ReferenceKind
  id: string
  name: string
  /** One line under the name: where it is filed, what it holds. */
  detail?: string
  /** The host knows the target but can no longer open it. */
  unavailable?: boolean
}

export type ResolveReference = (
  target: ReferenceTarget
) => ChatReference | undefined

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
