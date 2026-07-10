import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type ReactNode } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { ConsolePageLayout } from "../shared/layout"
import { ContextProfile } from "./profile"
import { type OrganizationSources } from "./types"

const contextTabs = [
  { label: "Organization", to: "/context", value: "organization" },
  { label: "Workstreams", to: "/context/workstreams", value: "workstreams" },
  { label: "Places", to: "/context/places", value: "places" },
] as const

type ContextTab = (typeof contextTabs)[number]["value"]

// Shared frame for the context tab routes: each tab is a child route under
// /context, so the active tab deep-links and survives reloads.
export function ContextPage({
  tab,
  children,
}: {
  tab: ContextTab
  children: (tenantId: string) => ReactNode
}) {
  return (
    <ConsolePage>
      {(organization) => (
        <ConsolePageLayout>
          <Tabs value={tab}>
            <TabsList className="w-fit !h-7">
              {contextTabs.map((item) => (
                <TabsTrigger key={item.value} value={item.value} asChild>
                  <Link to={item.to}>{item.label}</Link>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {children(organization.id)}
        </ConsolePageLayout>
      )}
    </ConsolePage>
  )
}

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
    // Reading-heavy profile content keeps a document width inside the frame.
    <div className="max-w-4xl">
      <ContextProfile
        tenantId={tenantId}
        website={readPrimaryWebsite(sources)}
        discovery={discovery}
        profile={profile}
        sources={sources}
      />
    </div>
  )
}

function readPrimaryWebsite(sources: OrganizationSources | undefined) {
  return sources?.find((source) => source.primary)?.url
}
