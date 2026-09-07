import {
  defaultSelection,
  type ModelSelection,
} from "@contracts/models/selection"
import { type MessageContext } from "@contracts/replies/answers"
import { useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { ChatComposer } from "@/shared/console/chat/composer"
import { TypedPlaceholder } from "@/shared/console/chat/composer/placeholder"
import { ChatHome } from "@/shared/console/chat/home"
import {
  chatSuggestionPool,
  rotateSuggestions,
  shownSuggestions,
} from "@/shared/console/chat/suggestions"
import { useConsoleNavigate } from "@/shared/console/shell/location"
import { conversationDestination } from "@/shared/console/shell/routes"
import { useNow } from "@/shared/console/time"
import { ConsolePage } from "../page"
import { useMentionSources } from "./mentions"
import { recentCount, useRecentConversations } from "./recent"
import { useReferenceTargets } from "./references"
import { useSendMessage } from "./send"

const noTargets: MessageContext[] = []

/** Where a chat starts: the first message opens a conversation and the
 *  console moves to it. Opened from a resource's page, the chat carries
 *  that resource as its context, shown as the composer's chip and sent
 *  with the first message, as is the model picked for it. */
export function ChatHomePage({ context }: { context?: MessageContext }) {
  return (
    <ConsolePage>
      {(organizationId) => (
        <ChatHomeContent context={context} organizationId={organizationId} />
      )}
    </ConsolePage>
  )
}

function ChatHomeContent({
  context,
  organizationId,
}: {
  context: MessageContext | undefined
  organizationId: string
}) {
  const navigate = useConsoleNavigate()
  const send = useSendMessage(organizationId)
  const recent = useRecentConversations(organizationId, recentCount)
  const now = useNow(60_000)
  const reference = useChatContext(organizationId, context)
  const mentions = useMentionSources(organizationId)
  const [selection, setSelection] = useState<ModelSelection>(defaultSelection)
  const { placeholder, suggestions } = useHomeSuggestions()
  // A blocked budget still opens the conversation with the message in it,
  // so the console moves there either way; a failure rejects, and the
  // composer keeps the draft while the toast says why.
  const start = (text: string, references: MessageContext[] = []) =>
    send({
      text,
      model: selection,
      ...(references.length === 0 ? {} : { references }),
      ...(reference.context === undefined
        ? {}
        : { context: reference.context }),
    }).then((result) =>
      navigate(conversationDestination(result.conversationId))
    )

  return (
    <ChatHome
      composer={
        <ChatComposer
          autoFocus
          context={reference.reference}
          mentions={mentions}
          onClearContext={reference.clear}
          onSelect={setSelection}
          onSend={start}
          onStop={() => {}}
          placeholder={placeholder}
          selection={selection}
        />
      }
      now={now}
      onSuggestion={start}
      recent={recent}
      suggestions={suggestions}
    />
  )
}

/** A few of the common asks, from a different place in the pool each
 *  visit, and the rest typed into the composer's placeholder. */
function useHomeSuggestions() {
  const [start] = useState(() =>
    Math.floor(Math.random() * chatSuggestionPool.length)
  )
  const rotated = useMemo(
    () => rotateSuggestions(chatSuggestionPool, start),
    [start]
  )
  const rest = useMemo(
    () => rotated.slice(shownSuggestions).map(({ text }) => text),
    [rotated]
  )

  return {
    placeholder: (
      <TypedPlaceholder fallback="Tell Jori what needs doing" phrases={rest} />
    ),
    suggestions: rotated.slice(0, shownSuggestions),
  }
}

/** The context the chat was opened with, named for the chip through the
 *  same query the thread's cards use. One the viewer may not see, or that
 *  is gone, drops out: no chip, and nothing sent. Clearing it leaves the
 *  search behind, so the plain /chat is what stays in history. */
function useChatContext(
  organizationId: string,
  context: MessageContext | undefined
) {
  const navigate = useNavigate()
  const targets = useMemo(
    () => (context === undefined ? noTargets : [context]),
    [context]
  )
  const resolve = useReferenceTargets(organizationId, targets)
  const reference = context === undefined ? undefined : resolve(context)

  return {
    context: reference === undefined ? undefined : context,
    reference,
    clear: () => void navigate({ to: "/chat", search: {}, replace: true }),
  }
}
