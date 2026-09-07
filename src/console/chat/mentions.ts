import { integrations } from "@contracts/integrations"
import { useQuery } from "convex/react"
import { useEffect, useMemo, useState } from "react"
import {
  type MentionResource,
  type MentionSources,
} from "@/shared/console/mentions/sources"
import { api } from "../../../convex/_generated/api"

/** How long a keystroke waits for the next before the search goes. */
const searchDelay = 150

/** What the composer may mention, read from Convex: every integration,
 *  the organization's skills, the tools its policy allows, and the
 *  resources the person can see — looked up only while a search is on,
 *  narrowed to what is searched for, the last answer standing while the
 *  next loads. */
export function useMentionSources(organizationId: string): MentionSources {
  const [query, setQuery] = useState<string | null>(null)
  const skills = useQuery(api.skills.catalog.list, { organizationId })
  const permissions = useQuery(api.permissions.tools.list, { organizationId })
  const { resources, searching } = useRetainedResources(
    organizationId,
    useSettledQuery(query)
  )

  return useMemo(
    () => ({
      integrations,
      onSearch: setQuery,
      resources,
      searching,
      skills: (skills?.skills ?? []).map((skill) => skill.name),
      tools: (permissions ?? [])
        .filter((permission) => permission.mode !== "blocked")
        .map((permission) => ({
          surface: permission.surface,
          tool: permission.tool,
        })),
    }),
    [permissions, resources, searching, skills]
  )
}

/** The query as the server should see it: a search settles a moment
 *  after the last keystroke, so a word typed is one lookup rather than
 *  one per letter; its start and its end apply at once. */
function useSettledQuery(query: string | null) {
  const [settled, setSettled] = useState(query)
  const isActive = query !== null
  const wasActive = settled !== null

  if (isActive !== wasActive) {
    setSettled(query)
  }

  useEffect(() => {
    if (query === null) {
      return
    }

    const timer = window.setTimeout(() => setSettled(query), searchDelay)

    return () => window.clearTimeout(timer)
  }, [query])

  return isActive === wasActive ? settled : query
}

/** The resources found, skipping the lookup while nothing is searched
 *  for and keeping the last answer while the next is on its way. */
function useRetainedResources(organizationId: string, query: string | null) {
  const listed = useQuery(
    api.references.mentions.list,
    query === null ? "skip" : { organizationId, query }
  )
  const [retained, setRetained] = useState<MentionResource[]>([])

  if (listed !== undefined && listed.resources !== retained) {
    setRetained(listed.resources)
  }

  return {
    resources: retained,
    searching: query !== null && listed === undefined,
  }
}
