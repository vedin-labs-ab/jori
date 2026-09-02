import { Link } from "@tanstack/react-router"
import { type ReactNode } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConsoleContentGrid, ConsolePageLayout } from "@/shared/console/layout"
import { ConsolePage } from "../page"
import { useToolPermissions } from "../permissions/controller"
import { NativePermissionsCard } from "./card/native"
import {
  organizationProviders,
  type ProviderDefinition,
  personalProviders,
} from "./catalog"
import { IntegrationProvider } from "./providers"
import { type IntegrationTab, integrationTabs } from "./routes"

// Integration cards hold permission rows, so the track floor is wide: one
// column on small screens, two on laptops, three or
// more only on wide monitors. Cards top-align at their natural height so an
// expanded permissions list doesn't stretch its row neighbors.
const integrationGrid =
  "items-start grid-cols-[repeat(auto-fill,minmax(min(28rem,100%),1fr))]"

export function OrganizationIntegrations() {
  return (
    <IntegrationsPage tab="organization">
      {(organizationId) => (
        <ProviderGrid
          organizationId={organizationId}
          providers={organizationProviders}
          withNativePermissions
        />
      )}
    </IntegrationsPage>
  )
}

export function PersonalIntegrations() {
  return (
    <IntegrationsPage tab="personal">
      {(organizationId) => (
        <ProviderGrid
          organizationId={organizationId}
          providers={personalProviders}
        />
      )}
    </IntegrationsPage>
  )
}

// Shared frame for the integration tab routes: each tab is a child route under
// /integrations, so the active tab deep-links and survives reloads.
function IntegrationsPage({
  children,
  tab,
}: {
  children: (organizationId: string) => ReactNode
  tab: IntegrationTab
}) {
  return (
    <ConsolePage>
      {(organizationId) => (
        <ConsolePageLayout>
          <Tabs value={tab}>
            <TabsList className="!h-7 w-fit">
              {integrationTabs.map((item) => (
                <TabsTrigger asChild key={item.value} value={item.value}>
                  <Link to={item.to}>{item.label}</Link>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {children(organizationId)}
        </ConsolePageLayout>
      )}
    </ConsolePage>
  )
}

function ProviderGrid({
  organizationId,
  providers,
  withNativePermissions = false,
}: {
  organizationId: string
  providers: readonly ProviderDefinition[]
  withNativePermissions?: boolean
}) {
  const permissions = useToolPermissions(organizationId)

  return (
    <ConsoleContentGrid className={integrationGrid}>
      {providers.map((provider) => (
        <IntegrationProvider
          key={provider.config.integration}
          organizationId={organizationId}
          permissions={permissions}
          provider={provider}
        />
      ))}
      {withNativePermissions ? (
        <NativePermissionsCard controller={permissions} />
      ) : null}
    </ConsoleContentGrid>
  )
}
