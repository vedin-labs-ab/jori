import { type ModelSelection } from "@contracts/models/selection"
import { useMutation } from "convex/react"
import { type GenericId } from "convex/values"
import { useCallback } from "react"
import { showErrorToast } from "@/shared/console/error"
import { api } from "../../../convex/_generated/api"

/** Sets the model and effort the conversation's next run uses; the live
 *  state carries the choice back to the picker. A failure says so. */
export function useChooseModel(
  organizationId: string,
  conversationId: GenericId<"conversations">
) {
  const choose = useMutation(api.conversations.console.choose)

  return useCallback(
    (model: ModelSelection) => {
      void choose({ organizationId, conversationId, model }).catch(
        (error: unknown) => showErrorToast(error, "Couldn't change the model.")
      )
    },
    [choose, conversationId, organizationId]
  )
}
