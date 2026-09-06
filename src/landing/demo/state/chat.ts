import { type ChatDraft, type ChatMessage } from "@/shared/console/chat/types"
import { type DemoConversation } from "../fixtures/chat"
import { type DemoAction, type DemoChat, type DemoState } from "./types"

/** How many characters of the reply each tick reveals. */
const revealStep = 14

export function reduceChat(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "sendChatMessage":
      return { ...state, chat: sent(state.chat, action) }
    case "advanceChatReply":
      return { ...state, chat: advanced(state.chat, action.at) }
    case "stopChatRun":
      return { ...state, chat: stopped(state.chat, action.at) }
    default:
      return state
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
    text: action.text,
    parts: [],
    context: action.context,
    answer: action.answer,
    createdAt: action.at,
  }
  const existing = chat.conversations.find(
    (conversation) => conversation.id === action.conversationId
  )
  const conversation: DemoConversation =
    existing === undefined
      ? {
          id: action.conversationId,
          title: action.text,
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
    live: {
      conversationId: conversation.id,
      run: { id: action.runId, status: "running" },
      reply: action.reply,
      startedAt: action.at,
      revealed: -1,
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

  if (live === null) {
    return chat
  }

  const revealed = Math.max(0, live.revealed) + revealStep

  if (revealed < live.reply.reasoning.length + live.reply.text.length) {
    return { ...chat, live: { ...live, revealed } }
  }

  const reply: ChatMessage = {
    id: `${live.run.id}:reply`,
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
    live: null,
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
