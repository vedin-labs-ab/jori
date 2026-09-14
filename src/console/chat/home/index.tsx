import { modelAvailabilityReason } from "@contracts/models/availability"
import {
  defaultSelection,
  type ModelSelection,
} from "@contracts/models/selection"
import { type MessageContext } from "@contracts/replies/answers"
import { type GenericId } from "convex/values"
import { useMemo, useState } from "react"
import { ChatComposer } from "@/shared/console/chat/composer"
import { TypedPlaceholder } from "@/shared/console/chat/composer/placeholder"
import { ChatHome } from "@/shared/console/chat/home"
import { ChatLocation } from "@/shared/console/chat/location"
import {
  chatSuggestionPool,
  rotateSuggestions,
  shownSuggestions,
} from "@/shared/console/chat/suggestions"
import { useConsoleNavigate } from "@/shared/console/shell/location"
import { conversationDestination } from "@/shared/console/shell/routes"
import { useNow } from "@/shared/console/time"
import { ConsolePage } from "../../page"
import { useMentionSources } from "../mentions"
import { useAvailableModels } from "../models"
import { recentCount, useRecentConversations } from "../recent"
import { useSendMessage } from "../send"
import { useChatEntry } from "./entry"

/** Ask Jori suggests a home for the chat; its resource is an inline mention. */
export function ChatHomePage({ context }: { context?: MessageContext }) {
  return (
    <ConsolePage>
      {(organizationId) => (
        <ChatHomeContent
          context={context}
          key={`${organizationId}:${context?.kind}:${context?.id}`}
          organizationId={organizationId}
        />
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
  const location = useChatEntry(organizationId, context)
  const mentions = useMentionSources(organizationId)
  const [selection, setSelection] = useState<ModelSelection>(defaultSelection)
  const availableModels = useAvailableModels()
  const unavailable =
    location.reason ?? modelAvailabilityReason(availableModels, selection)
  const { placeholder, suggestions } = useHomeSuggestions()
  // A blocked budget still opens the conversation with the message in it,
  // so the console moves there either way; a failure rejects, and the
  // composer keeps the draft while the toast says why.
  const start = (text: string, references: MessageContext[] = []) =>
    send({
      text,
      model: selection,
      ...(references.length === 0 ? {} : { references }),
      ...(location.folderId === null
        ? {}
        : { folderId: location.folderId as GenericId<"folders"> }),
    }).then((result) =>
      navigate(conversationDestination(result.conversationId))
    )

  return (
    <ChatHome
      composer={
        <ChatComposer
          autoFocus
          availableModels={availableModels}
          disabled={unavailable !== undefined}
          initialReference={location.initialReference}
          metadata={
            <ChatLocation
              folderId={location.folderId}
              folders={location.folders}
              onChange={location.select}
            />
          }
          mentions={mentions}
          onSelect={setSelection}
          onSend={start}
          onStop={() => {}}
          placeholder={placeholder}
          reason={unavailable}
          selection={selection}
        />
      }
      now={now}
      onSuggestion={start}
      recent={recent}
      suggestions={context === undefined ? suggestions : []}
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
