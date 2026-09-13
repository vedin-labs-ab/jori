import { useQuery } from "convex/react"
import { type ReactNode } from "react"
import { VisibilityDirectoryContext } from "@/shared/console/visibility/directory"
import { useActiveOrganization } from "@/shared/session/auth"
import { api } from "../../../../convex/_generated/api"
import { useGrantOptions } from "./options"

export function OrganizationVisibilityDirectory({
  children,
}: {
  children: ReactNode
}) {
  const organizationId = useActiveOrganization().data?.id
  return organizationId === undefined ? (
    children
  ) : (
    <Directory organizationId={organizationId}>{children}</Directory>
  )
}

function Directory({
  children,
  organizationId,
}: {
  children: ReactNode
  organizationId: string
}) {
  const options = useGrantOptions(organizationId)
  const grantees = useQuery(api.visibility.console.grantees, { organizationId })
  const tree = useQuery(api.folders.console.tree, { organizationId })
  return (
    <VisibilityDirectoryContext.Provider
      value={{
        ...options,
        viewerId: grantees?.viewerId ?? undefined,
        folders: tree?.status === "ready" ? tree.folders : undefined,
      }}
    >
      {children}
    </VisibilityDirectoryContext.Provider>
  )
}
