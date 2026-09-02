import { useQuery } from "convex/react"
import { type ReactNode, useEffect, useMemo } from "react"
import {
  ToolReferenceContext,
  type ToolReferenceLoader,
  type ToolReferences,
} from "@/shared/console/jobs/editor/instructions/access/wire"
import { api } from "../../../../convex/_generated/api"

/** Serves the editor's schema affordances from the organization's tool
 *  references: every loader the views mount subscribes to the wire schemas
 *  of its tools, so the data is usually here before a dialog opens. */
export function ToolReferenceProvider({
  children,
  organizationId,
}: {
  children: ReactNode
  organizationId: string
}) {
  const loader = useMemo(() => createLoader(organizationId), [organizationId])

  return (
    <ToolReferenceContext.Provider value={loader}>
      {children}
    </ToolReferenceContext.Provider>
  )
}

function createLoader(organizationId: string): ToolReferenceLoader {
  return function ToolReferencesQuery({ onChange, tools }) {
    const references = useToolReferences(organizationId, tools)

    useEffect(() => {
      if (references !== undefined) {
        onChange(references)
      }
    }, [onChange, references])

    return null
  }
}

/** Subscribe to the wire schemas for a set of tools. */
function useToolReferences(
  organizationId: string,
  tools: string[]
): ToolReferences | undefined {
  return useQuery(api.permissions.reference.list, { organizationId, tools })
}
