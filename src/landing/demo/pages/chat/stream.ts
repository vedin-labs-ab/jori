import { useEffect } from "react"
import { isLiveRun } from "@/shared/console/chat/types"
import { type DemoActions } from "../../state/actions"
import { type DemoLiveReply } from "../../state/types"

/** How long the run works before its reply starts to show. */
const workingMs = 900
/** How often the reply grows once it is showing. */
const revealMs = 40

/** Moves the live run along: it works a moment, then its reply arrives
 *  a stretch at a time, until the whole of it is filed as a message. */
export function useReplyStream(
  live: DemoLiveReply | null,
  actions: DemoActions
) {
  const revealed =
    live !== null && isLiveRun(live.run) ? live.revealed : undefined

  useEffect(() => {
    if (revealed === undefined) {
      return
    }

    const timer = window.setTimeout(
      actions.advanceChatReply,
      revealed < 0 ? workingMs : revealMs
    )

    return () => window.clearTimeout(timer)
  }, [actions, revealed])
}
