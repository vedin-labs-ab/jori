import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { ContextPage } from ".."
import { ContextProfile } from "./profile"
import { type OrganizationSources } from "./types"

export function ContextOrganization() {
  return (
    <ContextPage tab="organization">
      {(tenantId) => <OrganizationView tenantId={tenantId} />}
    </ContextPage>
  )
}

function OrganizationView({ tenantId }: { tenantId: string }) {
  const profile = useQuery(api.organization.profile.get, { tenantId })
  const discovery = useQuery(api.organization.discovery.get, { tenantId })
  const sources = useQuery(api.organization.sources.list, { tenantId })

  return (
    <div className="mx-auto w-full max-w-4xl">
      <ContextProfile
        discovery={discovery}
        profile={profile}
        sources={sources}
        tenantId={tenantId}
        website={readPrimaryWebsite(sources)}
      />
    </div>
  )
}

function readPrimaryWebsite(sources: OrganizationSources | undefined) {
  return sources?.find((source) => source.primary)?.url
}
