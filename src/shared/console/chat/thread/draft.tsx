import { Markdown } from "../../markdown"
import { type ChatDraft } from "../types"
import { ChatReasoning } from "./reasoning"
import { useRevealedText } from "./reveal"

/** The turn as it is written: the thinking while there is only that, then
 *  the reply's text revealed at a reading pace, with the thinking folded
 *  above it. The finished message takes the turn's place whole. */
export function ChatDraftTurn({ draft }: { draft: ChatDraft }) {
  const text = useRevealedText(draft.text)

  return (
    <>
      {draft.reasoning === "" ? null : (
        <ChatReasoning settled={text !== ""} text={draft.reasoning} />
      )}
      {text === "" ? null : <Markdown streaming text={text} />}
    </>
  )
}
