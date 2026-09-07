import { render } from "@testing-library/react"
import { vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type OpenTarget } from "@/shared/console/chat/pane/tabs"
import { ChatThread, type ChooseHandler } from "@/shared/console/chat/thread"
import { ChatDraftTurn } from "@/shared/console/chat/thread/draft"
import {
  type ChatDraft,
  type ChatMessage,
  type ChatReference,
  type ChatRun,
} from "@/shared/console/chat/types"

/**
 * A conversation to render the chat thread over in component tests: a
 * person's ask about a table, Jori's reply with its cards and chips, and
 * a reply that asks one question. `renderThread` mounts the thread the
 * way the console does, with the table the only reference that resolves.
 */

export const now = 1_700_000_000_000
export const table: ChatReference = {
  kind: "table",
  id: "collections_renewals",
  name: "Customer renewals",
  detail: "Finance › Renewals",
}

export function message(
  overrides: Partial<ChatMessage> & { id: string }
): ChatMessage {
  return {
    role: "jori",
    text: "",
    parts: [],
    createdAt: now - 60_000,
    ...overrides,
  }
}

export const ask = message({
  id: "m1",
  role: "person",
  text: "Which renewals are at risk?",
  context: { kind: "table", id: "collections_renewals" },
})

export const reply = message({
  id: "m2",
  text: "**Harbor House** renews Sep 24 and is at risk.",
  parts: [
    {
      kind: "reference",
      target: { kind: "table", id: "collections_renewals" },
    },
    { kind: "reference", target: { kind: "job", id: "jobs_gone" } },
    {
      kind: "choices",
      options: [
        { label: "Remind them" },
        { label: "Show the table", value: "table" },
      ],
    },
  ],
})

export const question = message({
  id: "m3",
  text: "One question first.",
  parts: [
    {
      kind: "choices",
      prompt: "Post the summary to #finance when done?",
      options: [
        { label: "Yes, post it", value: "post" },
        { label: "Keep it here" },
      ],
      freeform: true,
    },
  ],
})

export function renderThread({
  draft = null,
  live = null,
  messages,
  onChoose = vi.fn<ChooseHandler>(),
  onOpenReference = vi.fn<OpenTarget>(),
}: {
  draft?: ChatDraft | null
  live?: ChatRun | null
  messages: ChatMessage[]
  onChoose?: ChooseHandler
  onOpenReference?: OpenTarget
}) {
  return render(
    <TooltipProvider>
      <ChatThread
        draft={draft === null ? undefined : <ChatDraftTurn draft={draft} />}
        hasMore={false}
        isLoading={false}
        live={live}
        messages={messages}
        now={now}
        onChoose={onChoose}
        onLoadMore={vi.fn()}
        onOpenReference={onOpenReference}
        progress={<p>Working on it</p>}
        resolveReference={(target) =>
          target.id === "collections_renewals" ? table : undefined
        }
      />
    </TooltipProvider>
  )
}
