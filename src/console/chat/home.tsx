import { type MessageContext } from "@contracts/replies/answers"
import { useNavigate } from "@tanstack/react-router"
import { useMemo } from "react"
import { ChatComposer } from "@/shared/console/chat/composer"
import { ChatHome } from "@/shared/console/chat/home"
import { useConsoleNavigate } from "@/shared/console/shell/location"
import { conversationDestination } from "@/shared/console/shell/routes"
import { useNow } from "@/shared/console/time"
import { ConsolePage } from "../page"
import { useRecentConversations } from "./recent"
import { useReferenceTargets } from "./references"
import { useSendMessage } from "./send"

const recentCount = 10
const noTargets: MessageContext[] = []

/** What the home offers to ask first, written from the person's side. */
const suggestions = [
  "Summarize what changed this week",
  "Set up a weekly digest for my team",
  "Which jobs failed recently?",
  "Draft a job that watches a table for changes",
] as const

/** Where a chat starts: the first message opens a conversation and the
 *  console moves to it. Opened from a resource's page, the chat carries
 *  that resource as its context, shown as the composer's chip and sent
 *  with the first message. */
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
  // A blocked budget still opens the conversation with the message in it,
  // so the console moves there either way; only a failure stays.
  const start = (text: string) =>
    void send({
      text,
      ...(reference.context === undefined
        ? {}
        : { context: reference.context }),
    }).then((result) => {
      if (result !== undefined) {
        navigate(conversationDestination(result.conversationId))
      }
    })

  return (
    <ChatHome
      composer={
        <ChatComposer
          autoFocus
          context={reference.reference}
          live={null}
          onClearContext={reference.clear}
          onSend={start}
          onStop={() => {}}
        />
      }
      now={now}
      onSuggestion={start}
      recent={recent ?? []}
      suggestions={suggestions}
    />
  )
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
