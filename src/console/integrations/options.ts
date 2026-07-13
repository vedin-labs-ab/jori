import {
  type IntegrationOption,
  type IntegrationOptionMatch,
  type IntegrationOptionSource,
} from "@contracts/integrations/options"
import { type ReactAction, useAction } from "convex/react"
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react"
import { api } from "../../../convex/_generated/api"

type OptionsArgs = {
  disabled?: boolean
  isOpen: boolean
  match?: IntegrationOptionMatch
  source: IntegrationOptionSource
  tenantId: string
}

type OptionsState = {
  isLoading: boolean
  message?: string
  options: IntegrationOption[]
}

type SearchAction = ReactAction<typeof api.integrations.options.index.search>

export function useIntegrationOptions(args: OptionsArgs) {
  const search = useAction(api.integrations.options.index.search)
  const cache = useRef(new Map<string, IntegrationOption[]>())
  const [query, setQuery] = useState("")
  const [state, setState] = useState<OptionsState>({
    isLoading: false,
    options: [],
  })
  const matchKey = JSON.stringify(args.match ?? {})

  useEffect(
    () =>
      startOptionsSearch({
        active: args.isOpen && args.disabled !== true,
        cache: cache.current,
        matchKey,
        query,
        search,
        setState,
        source: args.source,
        tenantId: args.tenantId,
      }),
    [
      args.disabled,
      args.isOpen,
      args.source,
      args.tenantId,
      matchKey,
      query,
      search,
    ]
  )

  return { ...state, setQuery }
}

function startOptionsSearch(args: {
  active: boolean
  cache: Map<string, IntegrationOption[]>
  matchKey: string
  query: string
  search: SearchAction
  setState: Dispatch<SetStateAction<OptionsState>>
  source: IntegrationOptionSource
  tenantId: string
}) {
  if (!args.active) {
    return
  }

  const key = `${args.source}:${args.matchKey}:${args.query}`
  const cached = args.cache.get(key)

  if (cached !== undefined) {
    args.setState({ isLoading: false, options: cached })
    return
  }

  args.setState({ isLoading: true, options: [] })
  let cancelled = false
  const timeout = window.setTimeout(() => {
    void loadOptions(args, key, () => cancelled)
  }, 150)

  return () => {
    cancelled = true
    window.clearTimeout(timeout)
  }
}

async function loadOptions(
  args: Parameters<typeof startOptionsSearch>[0],
  key: string,
  isCancelled: () => boolean
) {
  try {
    const result = await args.search({
      tenantId: args.tenantId,
      source: args.source,
      query: args.query,
      match: JSON.parse(args.matchKey) as IntegrationOptionMatch,
    })

    if (isCancelled()) {
      return
    }

    const options = result.status === "ready" ? result.options : []

    args.setState({
      isLoading: false,
      message: result.status === "ready" ? undefined : result.message,
      options,
    })
    if (result.status === "ready") {
      args.cache.set(key, options)
    }
  } catch {
    if (!isCancelled()) {
      args.setState({
        isLoading: false,
        message: "Couldn't load options. Try again.",
        options: [],
      })
    }
  }
}
