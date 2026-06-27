import { useQuery } from "convex/react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "../../../convex/_generated/api"
import { type ActiveOrganization, ConsolePage } from "../page"
import { ConsolePageLayout } from "../shared/layout"
import { ContextProfile } from "./profile"
import { type OrganizationSources } from "./types"

export function OrganizationContext() {
  return (
    <ConsolePage>
      {(organization) => (
        <ContextView
          fallbackWebsite={readWebsite(organization)}
          tenantId={organization.id}
        />
      )}
    </ConsolePage>
  )
}

function ContextView({
  tenantId,
  fallbackWebsite,
}: {
  tenantId: string
  fallbackWebsite: string | undefined
}) {
  const profile = useQuery(api.organization.profile.get, { tenantId })
  const discovery = useQuery(api.organization.discovery.get, { tenantId })
  const sources = useQuery(api.organization.sources.list, { tenantId })
  const website = readPrimaryWebsite(sources) ?? fallbackWebsite

  return (
    <ConsolePageLayout>
      <Tabs defaultValue="organization" className="gap-4">
        <TabsList className="w-fit !h-7">
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger disabled value="layers">
            Layers
          </TabsTrigger>
        </TabsList>
        <TabsContent value="organization">
          <ContextProfile
            tenantId={tenantId}
            website={website}
            discovery={discovery}
            profile={profile}
            sources={sources}
          />
        </TabsContent>
      </Tabs>
    </ConsolePageLayout>
  )
}

function readWebsite(organization: ActiveOrganization) {
  const website = organization.publicMetadata?.website

  return typeof website === "string" && website.trim() !== ""
    ? website
    : undefined
}

function readPrimaryWebsite(sources: OrganizationSources | undefined) {
  return sources?.find((source) => source.primary)?.url
}
