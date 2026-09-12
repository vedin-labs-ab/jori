import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { ContextPage } from ".."
import { ContextProfile } from "./profile"
import { type OrganizationSources } from "./types"

export function ContextOrganization() {
  return (
    <ContextPage tab="organization">
      {(organizationId) => <OrganizationView organizationId={organizationId} />}
    </ContextPage>
  )
}

function OrganizationView({ organizationId }: { organizationId: string }) {
  const profile = useQuery(api.organization.profile.get, { organizationId })
  const discovery = useQuery(api.organization.discovery.get, { organizationId })
  const sources = useQuery(api.organization.sources.list, { organizationId })

  return (
    <ContextProfile
      discovery={discovery}
      profile={profile}
      sources={sources}
      organizationId={organizationId}
      website={readPrimaryWebsite(sources)}
    />
  )
}

function readPrimaryWebsite(sources: OrganizationSources | undefined) {
  return sources?.find((source) => source.primary)?.url
}
