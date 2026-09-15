import {
  type Candidate,
  type Hit,
  type SearchResponse,
} from "@contracts/discovery"
import { useAction, useQueries } from "convex/react"
import { useEffect, useMemo, useState } from "react"
import { type SearchState } from "@/shared/console/discovery/palette"
import { api } from "../../../convex/_generated/api"

export function useSearch(
  organizationId: string | undefined,
  input: string,
  retry = 0
): SearchState {
  const text = input.trim().replace(/\s+/g, " ").slice(0, 200)
  const response = useCandidates(organizationId, text, retry)
  const queries = useMemo(
    () => visibleQueries(organizationId, text, response?.candidates ?? []),
    [organizationId, text, response]
  )
  const values = Object.values(useQueries(queries)) as (
    | Hit[]
    | Error
    | undefined
  )[]
  const hits = values
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .slice(0, 20)
  if (!text || !organizationId) {
    return { status: "idle", hits: [], partial: false }
  }
  if (response === undefined || values.some((value) => value === undefined)) {
    return { status: "loading", hits, partial: false }
  }
  if (
    values.some((value) => value instanceof Error) ||
    (response.unavailable && !hits.length)
  ) {
    return { status: "unavailable", hits: [], partial: true }
  }
  return {
    status: "ready",
    hits,
    partial: response.partial || response.unavailable,
  }
}

export function useCandidates(
  organizationId: string | undefined,
  text: string,
  retry: number
) {
  const search = useAction(api.discovery.console.search)
  const [settled, setSettled] = useState<{
    organizationId: string
    text: string
    response: SearchResponse
    retry: number
  }>()
  useEffect(() => {
    if (!organizationId || !text) {
      return
    }
    let current = true
    const timer = window.setTimeout(() => {
      void search({ organizationId, text })
        .then((response: SearchResponse) => {
          if (current) {
            setSettled({ organizationId, text, retry, response })
          }
        })
        .catch(() => {
          if (current) {
            setSettled({
              organizationId,
              text,
              retry,
              response: { candidates: [], partial: true, unavailable: true },
            })
          }
        })
    }, 150)
    return () => {
      current = false
      window.clearTimeout(timer)
    }
  }, [organizationId, text, retry, search])
  return settled !== undefined &&
    settled.organizationId === organizationId &&
    settled.text === text &&
    settled.retry === retry
    ? settled.response
    : undefined
}

function visibleQueries(
  organizationId: string | undefined,
  text: string,
  candidates: Candidate[]
) {
  const queries: Record<
    string,
    {
      query: typeof api.discovery.console.visible
      args: { organizationId: string; text: string; candidates: Candidate[] }
    }
  > = {}
  if (!organizationId || !text) {
    return queries
  }
  for (let i = 0; i < Math.min(candidates.length, 20); i += 8) {
    queries[String(i)] = {
      query: api.discovery.console.visible,
      args: {
        organizationId,
        text,
        candidates: candidates.slice(i, Math.min(i + 8, 20)),
      },
    }
  }
  return queries
}
