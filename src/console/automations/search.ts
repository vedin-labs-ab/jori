import { type ReactAction } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../convex/_generated/api"
import {
  type AutomationEventProvider,
  type AutomationEventResource,
} from "../../../convex/automations/events"

type AutomationEventOptionSearchResult = Awaited<
  FunctionReturnType<typeof api.automations.options.search>
>

export type AutomationEventOption = Extract<
  AutomationEventOptionSearchResult,
  { status: "ready" }
>["options"][number]

type SearchAction = ReactAction<typeof api.automations.options.search>

export function searchEventOptions({
  provider,
  query,
  resource,
  search,
  setIsLoading,
  setMessage,
  setOptions,
  tenantId,
}: {
  provider: AutomationEventProvider
  query: string
  resource: Extract<AutomationEventResource, { type: "option" }>
  search: SearchAction
  setIsLoading: (isLoading: boolean) => void
  setMessage: (message: string | undefined) => void
  setOptions: (options: AutomationEventOption[]) => void
  tenantId: string
}) {
  let isCancelled = false
  const timeout = window.setTimeout(() => {
    setIsLoading(true)
    setMessage(undefined)

    search({
      tenantId,
      provider,
      source: resource.source,
      query,
    })
      .then((result) => {
        if (isCancelled) {
          return
        }

        if (result.status === "ready") {
          setOptions(result.options)
          setMessage(undefined)
        } else {
          setOptions([])
          setMessage(result.message)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setOptions([])
          setMessage("Could not load options. Try again.")
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })
  }, 150)

  return () => {
    isCancelled = true
    window.clearTimeout(timeout)
  }
}
