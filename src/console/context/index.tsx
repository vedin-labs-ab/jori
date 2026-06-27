import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { type ActiveOrganization, ConsolePage } from "../page"
import { ConsolePageLayout } from "../shared/layout"
import { ContextProfile } from "./profile"

export function OrganizationContext() {
  return (
    <ConsolePage>
      {(organization) => (
        <ContextView
          tenantId={organization.id}
          website={readWebsite(organization)}
        />
      )}
    </ConsolePage>
  )
}

function ContextView({
  tenantId,
  website,
}: {
  tenantId: string
  website: string | undefined
}) {
  const profile = useQuery(api.organization.profile.get, { tenantId })
  const discovery = useQuery(api.organization.discovery.get, { tenantId })
  const sources = useQuery(api.organization.sources.list, { tenantId })

  return (
    <ConsolePageLayout>
      <ContextProfile
        tenantId={tenantId}
        website={website}
        discovery={discovery}
        profile={profile}
        sources={sources}
      />
    </ConsolePageLayout>
  )
}

function readWebsite(organization: ActiveOrganization) {
  const website = organization.publicMetadata?.website

  return typeof website === "string" && website.trim() !== ""
    ? website
    : undefined
}
