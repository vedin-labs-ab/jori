import {
  type ChoicesAnswer,
  type MessageContext,
} from "@contracts/replies/answers"
import { type Dispatch } from "react"
import { demoReply } from "../../fixtures/chat"
import { type DemoMint } from "../../fixtures/ids"
import { type DemoAction } from "../types"

export function chatActions(dispatch: Dispatch<DemoAction>, mint: DemoMint) {
  return {
    /** Sends a message into a conversation, or into a new one when none
     *  is named, and starts the run that answers it. Answers with the
     *  conversation the message landed in. */
    sendChatMessage: (
      text: string,
      conversationId?: string,
      carried?: { context?: MessageContext; answer?: ChoicesAnswer }
    ) => {
      const id = conversationId ?? mint("conversations")

      dispatch({
        type: "sendChatMessage",
        at: Date.now(),
        conversationId: id,
        messageId: mint("messages"),
        runId: mint("runs"),
        text,
        context: carried?.context,
        answer: carried?.answer,
        reply: demoReply(text),
      })

      return id
    },
    advanceChatReply: () =>
      dispatch({ type: "advanceChatReply", at: Date.now() }),
    stopChatRun: () => dispatch({ type: "stopChatRun", at: Date.now() }),
  }
}
