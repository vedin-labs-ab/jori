import {
  type AutomationEventIntegration,
  type AutomationEventParameter,
} from "@contracts/automations/events"
import { type ReactAction } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../../../convex/_generated/api"

type AutomationEventOptionSearchResult = Awaited<
  FunctionReturnType<typeof api.automations.options.search>
>

export type AutomationEventOption = Extract<
  AutomationEventOptionSearchResult,
  { status: "ready" }
>["options"][number]

type SearchAction = ReactAction<typeof api.automations.options.search>

export function searchEventOptions({
  integration,
  query,
  parameter,
  match,
  search,
  setIsLoading,
  setMessage,
  setOptions,
  tenantId,
}: {
  integration: AutomationEventIntegration
  query: string
  parameter: Extract<AutomationEventParameter, { type: "option" }>
  match: Record<string, string>
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
      integration,
      source: parameter.source,
      query,
      match,
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
