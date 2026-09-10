import { modelSlugs } from "@contracts/models/catalog"
import { ConvexProvider } from "convex/react"
import { useEffect, useState } from "react"
import { useSendMessage } from "@/console/chat/send"
import { chatContext, chatSelection } from "@/landing/demo/fixtures/chat"
import { ChatComposer } from "@/shared/console/chat/composer"
import { ChatThread } from "@/shared/console/chat/thread"
import { PaneState } from "./pane"
import { localService } from "./service"
import { useThread } from "./threadstate"

export function ChatStates({ state }: { state: string }) {
  const [service] = useState(localService)
  useEffect(
    () => () => {
      void service.client.close()
    },
    [service]
  )
  return (
    <ConvexProvider client={service.client}>
      <ThreadState service={service} state={state} />
    </ConvexProvider>
  )
}

function ThreadState({
  state,
  service,
}: {
  state: string
  service: ReturnType<typeof localService>
}) {
  const thread = useThread(state, service)
  if (state.startsWith("pane-")) {
    return (
      <PaneState
        state={state}
        composer={<Composer resolve={thread.resolveReference} />}
      >
        <ChatThread {...thread} />
      </PaneState>
    )
  }
  return (
    <>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <ChatThread {...thread} />
      </div>
      <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Composer resolve={thread.resolveReference} />
      </div>
    </>
  )
}

function Composer({
  resolve,
}: {
  resolve: ReturnType<typeof useThread>["resolveReference"]
}) {
  const [selection, setSelection] = useState(chatSelection)
  const send = useSendMessage("layout-chat-fixture")
  return (
    <ChatComposer
      availableModels={modelSlugs}
      onSelect={setSelection}
      onSend={(text, references) =>
        send({
          conversationId: "conversations_renewals" as Parameters<
            typeof send
          >[0]["conversationId"],
          text,
          references,
        })
      }
      onStop={() => undefined}
      resolve={resolve}
      selection={selection}
      usage={chatContext}
    />
  )
}
