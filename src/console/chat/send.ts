import { insertAtTop, useMutation } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { type GenericId } from "convex/values"
import { useCallback } from "react"
import { toast } from "sonner"
import { showErrorToast } from "@/shared/console/error"
import { api } from "../../../convex/_generated/api"

type SendArgs = Omit<
  FunctionArgs<typeof api.conversations.console.send>,
  "organizationId"
>

const blockedMessage =
  "Jori is out of usage, so this message waits. New work starts once the wallet is topped up or the monthly allowance resets."

/** Sends the person's message. In an open conversation the bubble lands
 *  before the round trip, at the top of the newest-first page the thread
 *  reads; the reply follows through the conversation's live state. A
 *  blocked budget keeps the message and says so; a failure says why and
 *  rejects, so the composer keeps the draft for another try. */
export function useSendMessage(organizationId: string) {
  const send = useMutation(api.conversations.console.send).withOptimisticUpdate(
    (localStore, args) => {
      if (args.conversationId === undefined) {
        return
      }

      insertAtTop({
        paginatedQuery: api.messages.console.page,
        argsToMatch: {
          organizationId: args.organizationId,
          conversationId: args.conversationId,
        },
        localQueryStore: localStore,
        item: {
          id: crypto.randomUUID() as GenericId<"messages">,
          role: "person",
          text: args.text,
          data: {
            ...(args.context === undefined ? {} : { context: args.context }),
            ...(args.references === undefined
              ? {}
              : { references: args.references }),
            ...(args.answer === undefined ? {} : { answer: args.answer }),
          },
          createdAt: Date.now(),
        },
      })
    }
  )

  return useCallback(
    async (args: SendArgs) => {
      try {
        const result = await send({ organizationId, ...args })

        if (result.status === "blocked") {
          toast.warning(blockedMessage)
        }

        return result
      } catch (error) {
        showErrorToast(error, "Couldn't send your message.")

        throw error
      }
    },
    [organizationId, send]
  )
}

/** A reply's chip pressed: the answer goes, and a failure has said why
 *  in its toast, the chips staying to be pressed again. */
export function sendAnswer(
  send: ReturnType<typeof useSendMessage>,
  args: SendArgs
) {
  void send(args).catch(() => undefined)
}
