import { useMutation, useQuery } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { type GenericId } from "convex/values"
import { ChatComposer } from "@/shared/console/chat/composer"
import { referenceDestination } from "@/shared/console/chat/presentation"
import { ChatThread } from "@/shared/console/chat/thread"
import { type ChatRun, isLiveRun } from "@/shared/console/chat/types"
import { showErrorToast } from "@/shared/console/error"
import { useMaterialBreadcrumb } from "@/shared/console/materials/breadcrumb"
import { MaterialPlaceholder } from "@/shared/console/materials/detail/placeholder"
import { useConsoleNavigate } from "@/shared/console/shell/location"
import { useDocumentTitle } from "@/shared/console/shell/title"
import { useNow } from "@/shared/console/time"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { useConversationMessages } from "./messages"
import { ChatProgress } from "./progress"
import { useReferences } from "./references"
import { useSendMessage } from "./send"

type LiveConversation = Extract<
  FunctionReturnType<typeof api.conversations.console.live>,
  { status: "ready" }
>

/** One conversation with Jori: its turns, the run answering the latest
 *  one, and the composer that sends into it. */
export function ConversationPage({
  conversationId,
}: {
  conversationId: GenericId<"conversations">
}) {
  return (
    <ConsolePage>
      {(organizationId) => (
        <ConversationContent
          conversationId={conversationId}
          organizationId={organizationId}
        />
      )}
    </ConsolePage>
  )
}

/** The live state answers first: it says whether the conversation is the
 *  person's to read, so the thread's own queries mount only when it is. */
function ConversationContent({
  conversationId,
  organizationId,
}: {
  conversationId: GenericId<"conversations">
  organizationId: string
}) {
  const live = useQuery(api.conversations.console.live, {
    organizationId,
    conversationId,
  })

  if (live === undefined) {
    return <MaterialPlaceholder noun="conversation" status="loading" />
  }

  if (live.status === "unauthorized") {
    return (
      <MaterialPlaceholder
        message={live.message}
        noun="conversation"
        status="unauthorized"
      />
    )
  }

  if (live.status === "not_found") {
    return <MaterialPlaceholder noun="conversation" status="not_found" />
  }

  return (
    <ConversationThread
      conversationId={conversationId}
      live={live}
      organizationId={organizationId}
    />
  )
}

function ConversationThread({
  conversationId,
  live,
  organizationId,
}: {
  conversationId: GenericId<"conversations">
  live: LiveConversation
  organizationId: string
}) {
  const run = live.run
  const isLive = isLiveRun(run)
  const now = useNow(isLive ? 1000 : 60_000)
  const page = useConversationMessages(organizationId, conversationId)
  const send = useSendMessage(organizationId)
  const stop = useStopRun(organizationId, run)
  const resolveReference = useReferences(organizationId, page.messages)
  const navigate = useConsoleNavigate()

  useDocumentTitle(live.title === "" ? undefined : `${live.title} · Jori`)
  useMaterialBreadcrumb(live.title)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatThread
        draft={live.draft}
        hasMore={page.hasMore}
        isLoading={page.isLoading}
        live={run}
        messages={page.messages}
        now={now}
        onChoose={(messageId, part, values, text) =>
          void send({
            conversationId,
            text,
            answer: {
              messageId: messageId as GenericId<"messages">,
              part,
              values,
            },
          })
        }
        onLoadMore={page.loadMore}
        onOpenReference={(target) => navigate(referenceDestination(target))}
        progress={
          isLive ? (
            <ChatProgress
              now={now}
              onStop={stop}
              organizationId={organizationId}
              run={run}
            />
          ) : null
        }
        resolveReference={resolveReference}
      />
      <ChatComposer
        autoFocus
        live={run}
        onSend={(text) => void send({ conversationId, text })}
        onStop={stop}
      />
    </div>
  )
}

/** Stops the live run the way the Activity page does; a failure says so. */
function useStopRun(organizationId: string, run: ChatRun | null) {
  const stop = useMutation(api.runs.control.stop)

  return () => {
    if (run === null) {
      return
    }

    void stop({ organizationId, runId: run.id as GenericId<"runs"> }).catch(
      (error: unknown) => showErrorToast(error, "Couldn't stop the run.")
    )
  }
}
