import {
  type ChatDraft,
  type ChatMessage,
  isLiveRun,
} from "@/shared/console/chat/types"
import {
  chatRunMicros,
  type DemoConversation,
  demoChatAuthor,
} from "../fixtures/chat"
import { viewerId } from "../fixtures/people"
import { usageDate } from "../fixtures/usage"
import { type DemoAction, type DemoChat, type DemoState } from "./types"

/** How many characters of the reply each tick reveals. */
const revealStep = 14

export function reduceChat(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "sendChatMessage":
      return { ...state, chat: sent(state.chat, action) }
    case "advanceChatReply":
      return settled(state, advanced(state.chat, action.at), action.at)
    case "stopChatRun":
      return settled(state, stopped(state.chat, action.at), action.at)
    default:
      return state
  }
}

/** A finished reply contributes one run and its illustrative cost. */
function settled(state: DemoState, chat: DemoChat, at: number): DemoState {
  const live = state.chat.live

  if (
    live === null ||
    !isLiveRun(live.run) ||
    isLiveRun(chat.live?.run ?? null)
  ) {
    return { ...state, chat }
  }

  const conversation = chat.conversations.find(
    (chat) => chat.id === live.conversationId
  )

  return {
    ...state,
    chat,
    usage: [
      ...state.usage,
      {
        conversationId: live.conversationId,
        folderId: conversation?.folderId,
        date: usageDate(at),
        micros: chatRunMicros,
        ended: 1,
        failed: 0,
      },
    ],
  }
}

/** The person's message lands in its conversation, opening one when
 *  there is none, and a run starts on it. */
function sent(
  chat: DemoChat,
  action: Extract<DemoAction, { type: "sendChatMessage" }>
): DemoChat {
  const message: ChatMessage = {
    id: action.messageId,
    role: "person",
    author: demoChatAuthor,
    text: action.text,
    parts: [],
    context: action.context,
    references: action.references,
    answer: action.answer,
    createdAt: action.at,
  }
  const existing = chat.conversations.find(
    (conversation) => conversation.id === action.conversationId
  )
  const conversation: DemoConversation =
    existing === undefined
      ? {
          id: action.conversationId as DemoConversation["id"],
          title: action.text,
          createdBy: viewerId,
          visibility: { mode: "private" },
          updatedAt: action.at,
          messages: [message],
        }
      : {
          ...existing,
          updatedAt: action.at,
          messages: [...existing.messages, message],
        }

  return {
    conversations: [
      conversation,
      ...chat.conversations.filter((other) => other.id !== conversation.id),
    ],
    live:
      chat.live?.conversationId === conversation.id && isLiveRun(chat.live.run)
        ? {
            ...chat.live,
            pending: [...(chat.live.pending ?? []), action.reply],
          }
        : {
            conversationId: conversation.id,
            run: { id: action.runId, status: "running" },
            reply: action.reply,
            startedAt: action.at,
            revealed: -1,
          },
  }
}

/** Changing between personal and shared execution ends the old run. */
export function setChatVisibility(
  state: DemoState,
  action: Extract<DemoAction, { type: "setVisibility" }>
): DemoState {
  const conversation = state.chat.conversations.find(
    (chat) => chat.id === action.target.id
  )

  if (conversation === undefined) {
    return state
  }

  const changesContext =
    JSON.stringify(conversation.visibility) !==
    JSON.stringify(action.visibility)
  const next =
    changesContext && state.chat.live?.conversationId === conversation.id
      ? reduceChat(state, { type: "stopChatRun", at: action.at })
      : state

  return {
    ...next,
    chat: {
      ...next.chat,
      conversations: next.chat.conversations.map((chat) =>
        chat.id === conversation.id
          ? { ...chat, visibility: action.visibility, updatedAt: action.at }
          : chat
      ),
    },
  }
}

/** The person stops the run: it ends as stopped, its reply unsent, and
 *  the thread says so until the next message starts another. */
function stopped(chat: DemoChat, at: number): DemoChat {
  const { live } = chat

  return live === null
    ? chat
    : {
        ...chat,
        live: {
          ...live,
          run: { ...live.run, status: "stopped", endedAt: at },
          revealed: -1,
        },
      }
}

/** The run reveals the next stretch of its reply, thinking first, or,
 *  once the whole reply is out, files it as Jori's message and ends. */
function advanced(chat: DemoChat, at: number): DemoChat {
  const { live } = chat

  if (live === null || !isLiveRun(live.run)) {
    return chat
  }

  const revealed = Math.max(0, live.revealed) + revealStep

  if (revealed < live.reply.reasoning.length + live.reply.text.length) {
    return { ...chat, live: { ...live, revealed } }
  }

  const reply: ChatMessage = {
    id: `${live.run.id}:reply:${chat.conversations.find((chat) => chat.id === live.conversationId)?.messages.length}`,
    role: "jori",
    text: live.reply.text,
    parts: live.reply.parts,
    createdAt: at,
  }

  return {
    conversations: chat.conversations.map((conversation) =>
      conversation.id === live.conversationId
        ? {
            ...conversation,
            updatedAt: at,
            messages: [...conversation.messages, reply],
          }
        : conversation
    ),
    live: live.pending?.length
      ? {
          ...live,
          reply: live.pending[0],
          pending: live.pending.slice(1),
          revealed: -1,
        }
      : null,
  }
}

/** The turn so far, thinking then text, or nothing while the run is still
 *  working. */
export function liveDraft(
  chat: DemoChat,
  conversationId: string
): ChatDraft | null {
  const { live } = chat

  if (
    live === null ||
    live.conversationId !== conversationId ||
    live.revealed < 0
  ) {
    return null
  }

  const { reasoning, text } = live.reply

  return {
    reasoning: reasoning.slice(0, live.revealed),
    text: text.slice(0, Math.max(0, live.revealed - reasoning.length)),
  }
}
