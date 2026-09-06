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
  /** The choices part this message answers. */
  answer?: ChoicesAnswer
  createdAt: number
}

export type ChatConversation = {
  id: string
  title: string
  updatedAt: number
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
}

/** What a reference part or a message's context points at. */
export type ReferenceTarget = {
  kind: ReferenceKind
  id: string
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

/** Whether a run is still going, so the thread shows progress and the
 *  composer offers to stop it. */
export function isLiveRun(run: ChatRun | null): run is ChatRun {
  return run !== null && (run.status === "queued" || run.status === "running")
}
