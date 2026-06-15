import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConsoleContentGrid } from "../layout"
import { ConsolePage } from "../page"
import { NativePermissionsCard } from "../permissions"
import { useToolPermissions } from "../permissions/controller"
import { GitHubConnection } from "./connections/github"
import {
  GmailConnection,
  GoogleCalendarConnection,
  GoogleDriveConnection,
} from "./connections/google"
import { LinearConnection } from "./connections/linear"
import {
  MicrosoftCalendarConnection,
  MicrosoftEmailConnection,
} from "./connections/microsoft"
import { NotionConnection } from "./connections/notion"
import { SlackConnection } from "./connections/slack"

export function Integrations() {
  return (
    <ConsolePage>
      {(organization) => <IntegrationTabs tenantId={organization.id} />}
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
        <ConsoleContentGrid className="md:grid-cols-2">
          <SlackConnection permissions={permissions} tenantId={tenantId} />
          <LinearConnection permissions={permissions} tenantId={tenantId} />
          <GitHubConnection permissions={permissions} tenantId={tenantId} />
          <NotionConnection permissions={permissions} tenantId={tenantId} />
          <GoogleDriveConnection
            permissions={permissions}
            tenantId={tenantId}
          />
          <NativePermissionsCard controller={permissions} />
        </ConsoleContentGrid>
      </TabsContent>
      <TabsContent value="user" asChild>
        <ConsoleContentGrid className="md:grid-cols-2">
          <GmailConnection permissions={permissions} tenantId={tenantId} />
          <GoogleCalendarConnection
            permissions={permissions}
            tenantId={tenantId}
          />
          <MicrosoftEmailConnection
            permissions={permissions}
            tenantId={tenantId}
          />
          <MicrosoftCalendarConnection
            permissions={permissions}
            tenantId={tenantId}
          />
        </ConsoleContentGrid>
      </TabsContent>
    </Tabs>
  )
}
