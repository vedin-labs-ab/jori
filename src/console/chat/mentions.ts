import { integrations } from "@contracts/integrations"
import { useQuery } from "convex/react"
import { useMemo, useState } from "react"
import {
  type MentionResource,
  type MentionSources,
} from "@/shared/console/mentions/sources"
import { api } from "../../../convex/_generated/api"

/** What the composer may mention, read from Convex: every integration,
 *  the organization's skills, the tools its policy allows, and the
 *  resources the person can see — narrowed to what is searched for, the
 *  last answer standing while the next loads. */
export function useMentionSources(organizationId: string): MentionSources {
  const [query, setQuery] = useState("")
  const skills = useQuery(api.skills.catalog.list, { organizationId })
  const permissions = useQuery(api.permissions.tools.list, { organizationId })
  const resources = useRetainedResources(organizationId, query)

  return useMemo(
    () => ({
      integrations,
      onSearch: setQuery,
      resources,
      skills: (skills?.skills ?? []).map((skill) => skill.name),
      tools: (permissions ?? [])
        .filter((permission) => permission.mode !== "blocked")
        .map((permission) => ({
          label: permission.label,
          surface: permission.surface,
          tool: permission.tool,
        })),
    }),
    [permissions, resources, skills]
  )
}

function useRetainedResources(organizationId: string, query: string) {
  const listed = useQuery(api.references.mentions.list, {
    organizationId,
    query,
  })
  const [retained, setRetained] = useState<MentionResource[]>([])

  if (listed !== undefined && listed.resources !== retained) {
    setRetained(listed.resources)
  }

  return retained
}
