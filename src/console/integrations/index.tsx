import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConsolePage } from "../page"
import { useToolPermissions } from "../permissions/controller"
import { ConsoleContentGrid } from "../shared/layout"
import { NativePermissionsCard } from "./card/native"
import { GitHubIntegration } from "./providers/github"
import { GmailIntegration, GoogleCalendarIntegration } from "./providers/google"
import { LinearIntegration } from "./providers/linear"
import {
  MicrosoftCalendarIntegration,
  MicrosoftEmailIntegration,
} from "./providers/microsoft"
import { NotionIntegration } from "./providers/notion"
import { SlackIntegration } from "./providers/slack"

// Integration cards hold permission rows, so the track floor is wider than
// the playbook grid's: one column on small screens, two on laptops, three or
// more only on wide monitors. Cards top-align at their natural height so an
// expanded permissions list doesn't stretch its row neighbors.
const integrationGrid =
  "items-start grid-cols-[repeat(auto-fill,minmax(min(28rem,100%),1fr))]"

export function Integrations() {
  return (
    <ConsolePage>
      {(tenantId) => <IntegrationTabs tenantId={tenantId} />}
    </ConsolePage>
  )
}

function IntegrationTabs({ tenantId }: { tenantId: string }) {
  const permissions = useToolPermissions(tenantId)

  return (
    <Tabs defaultValue="tenant" className="gap-4">
      <TabsList className="w-fit !h-7">
        <TabsTrigger value="tenant">Organization</TabsTrigger>
        <TabsTrigger value="user">Personal</TabsTrigger>
      </TabsList>
      <TabsContent value="tenant" asChild>
        <ConsoleContentGrid className={integrationGrid}>
          <SlackIntegration permissions={permissions} tenantId={tenantId} />
          <LinearIntegration permissions={permissions} tenantId={tenantId} />
          <GitHubIntegration permissions={permissions} tenantId={tenantId} />
          <NotionIntegration permissions={permissions} tenantId={tenantId} />
          <NativePermissionsCard controller={permissions} />
        </ConsoleContentGrid>
      </TabsContent>
      <TabsContent value="user" asChild>
        <ConsoleContentGrid className={integrationGrid}>
          <GmailIntegration permissions={permissions} tenantId={tenantId} />
          <GoogleCalendarIntegration
            permissions={permissions}
            tenantId={tenantId}
          />
          <MicrosoftEmailIntegration
            permissions={permissions}
            tenantId={tenantId}
          />
          <MicrosoftCalendarIntegration
            permissions={permissions}
            tenantId={tenantId}
          />
        </ConsoleContentGrid>
      </TabsContent>
    </Tabs>
  )
}
