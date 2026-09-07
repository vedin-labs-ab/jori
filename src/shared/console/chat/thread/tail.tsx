import { type ReactNode, useEffect } from "react"
import {
  MessageScrollerItem,
  useMessageScroller,
} from "@/components/ui/message-scroller"
import {
  type ChatMessage,
  type ChatRun,
  endedWithoutReply,
  isLiveRun,
} from "../types"
import { JoriMessage } from "./message"
import { RunNotice } from "./notice"

/** After the messages: one turn of Jori's while the run works — what it
 *  is doing, then the reply as far as it has come, under a single mark —
 *  or, when the run ended without the reply, the notice that says so. A
 *  run starts from the person's message, so a message of Jori's standing
 *  last under a live run is that run's own heads-up, and the work goes on
 *  under it rather than as a new turn. A host that shows the draft alone
 *  has a turn with nothing in it until the draft says something; the
 *  item hides itself for as long as that is so, without the thread
 *  having to read the draft. */
export function ThreadTail({
  draft,
  live,
  messages,
  progress,
}: {
  draft: ReactNode
  live: ChatRun | null
  messages: ChatMessage[]
  progress: ReactNode
}) {
  if (isLiveRun(live) && (progress !== undefined || draft !== undefined)) {
    return (
      <MessageScrollerItem className="has-[[data-slot=turn]:empty]:hidden">
        <JoriMessage continued={messages.at(-1)?.role === "jori"} streaming>
          {progress}
          {draft}
        </JoriMessage>
      </MessageScrollerItem>
    )
  }

  return endedWithoutReply(messages, live) ? (
    <MessageScrollerItem>
      <RunNotice run={live} />
    </MessageScrollerItem>
  ) : null
}

/** Brings each new turn of the person's to the top of the view as it is
 *  sent, so the reply grows under it; the scroller anchors the first
 *  render the same way on its own. */
export function AnchorOnTurn({ anchorId }: { anchorId: string | undefined }) {
  const { scrollToMessage } = useMessageScroller()

  useEffect(() => {
    if (anchorId !== undefined) {
      scrollToMessage(anchorId, { align: "start" })
    }
  }, [anchorId, scrollToMessage])

  return null
}
