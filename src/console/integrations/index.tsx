import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConsolePage } from "../page"
import { NativePermissionsCard } from "../permissions"
import { useToolPermissions } from "../permissions/controller"
import { GitHubConnection } from "./providers/github"
import { GmailConnection, GoogleCalendarConnection } from "./providers/google"
import { LinearConnection } from "./providers/linear"
import {
  MicrosoftCalendarConnection,
  MicrosoftEmailConnection,
} from "./providers/microsoft"
import { NotionConnection } from "./providers/notion"
import { SlackConnection } from "./providers/slack"

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
      <TabsList className="w-fit">
        <TabsTrigger value="tenant">Tenant</TabsTrigger>
        <TabsTrigger value="user">User</TabsTrigger>
      </TabsList>
      <TabsContent value="tenant" className="grid gap-4 md:grid-cols-2">
        <SlackConnection permissions={permissions} tenantId={tenantId} />
        <LinearConnection permissions={permissions} tenantId={tenantId} />
        <GitHubConnection permissions={permissions} tenantId={tenantId} />
        <NotionConnection permissions={permissions} tenantId={tenantId} />
        <NativePermissionsCard controller={permissions} />
      </TabsContent>
      <TabsContent value="user" className="grid gap-4 md:grid-cols-2">
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
      </TabsContent>
    </Tabs>
  )
}
