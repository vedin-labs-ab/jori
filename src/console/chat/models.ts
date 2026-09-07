import { isModelSlug, type ModelSlug } from "@contracts/models/catalog"
import { type ModelSelection } from "@contracts/models/selection"
import { useAction, useMutation } from "convex/react"
import { type GenericId } from "convex/values"
import { useCallback, useEffect, useState } from "react"
import { showErrorToast } from "@/shared/console/error"
import { api } from "../../../convex/_generated/api"

/** Re-read on focus so an old tab does not keep offering removed models.
 * The inference boundary independently enforces the same regional catalog. */
export function useAvailableModels() {
  const list = useAction(api.model.available.list)
  const [models, setModels] = useState<ModelSlug[]>()
  useEffect(() => {
    let active = true
    const refresh = () => {
      void list({}).then(
        (available) => {
          if (active) {
            setModels(available.filter(isModelSlug))
          }
        },
        () => {
          if (active) {
            setModels([])
          }
        }
      )
    }
    refresh()
    window.addEventListener("focus", refresh)
    return () => {
      active = false
      window.removeEventListener("focus", refresh)
    }
  }, [list])
  return models
}

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
