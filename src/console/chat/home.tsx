import { ChatComposer } from "@/shared/console/chat/composer"
import { ChatHome } from "@/shared/console/chat/home"
import { useConsoleNavigate } from "@/shared/console/shell/location"
import { conversationDestination } from "@/shared/console/shell/routes"
import { useNow } from "@/shared/console/time"
import { ConsolePage } from "../page"
import { useRecentConversations } from "./recent"
import { useSendMessage } from "./send"

const recentCount = 10

/** What the home offers to ask first, written from the person's side. */
const suggestions = [
  "Summarize what changed this week",
  "Set up a weekly digest for my team",
  "Which jobs failed recently?",
  "Draft a job that watches a table for changes",
] as const

/** Where a chat starts: the first message opens a conversation and the
 *  console moves to it. */
export function ChatHomePage() {
  return (
    <ConsolePage>
      {(organizationId) => <ChatHomeContent organizationId={organizationId} />}
    </ConsolePage>
  )
}

function ChatHomeContent({ organizationId }: { organizationId: string }) {
  const navigate = useConsoleNavigate()
  const send = useSendMessage(organizationId)
  const recent = useRecentConversations(organizationId, recentCount)
  const now = useNow(60_000)
  // A blocked budget still opens the conversation with the message in it,
  // so the console moves there either way; only a failure stays.
  const start = (text: string) =>
    void send({ text }).then((result) => {
      if (result !== undefined) {
        navigate(conversationDestination(result.conversationId))
      }
    })

  return (
    <ChatHome
      composer={
        <ChatComposer autoFocus live={null} onSend={start} onStop={() => {}} />
      }
      now={now}
      onSuggestion={start}
      recent={recent ?? []}
      suggestions={suggestions}
    />
  )
}
