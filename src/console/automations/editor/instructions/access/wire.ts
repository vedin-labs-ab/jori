import { useQuery } from "convex/react"
import { api } from "../../../../../../convex/_generated/api"

export type ToolReferences = Record<
  string,
  { request: unknown; response: unknown }
>

/** Subscribe to the wire schemas for a set of tools. Callers enable this on
 *  the first sign of intent — hovering a schema affordance — so the data is
 *  already here by the time a schema dialog opens. */
export function useToolReferences(
  tenantId: string,
  tools: string[],
  enabled: boolean
): ToolReferences | undefined {
  return useQuery(
    api.permissions.reference.list,
    enabled ? { tenantId, tools } : "skip"
  )
}
