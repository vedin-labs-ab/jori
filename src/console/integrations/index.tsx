import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConsolePage } from "../page"
import { NativePermissionsCard } from "../permissions"
import { useToolPermissions } from "../permissions/controller"
import { GitHubConnection } from "./github"
import { GmailConnection, GoogleCalendarConnection } from "./google"
import { LinearConnection } from "./linear"
import {
  MicrosoftCalendarConnection,
  MicrosoftEmailConnection,
} from "./microsoft"
import { NotionConnection } from "./notion"
import { SlackConnection } from "./slack"

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1">
          <h1 className="font-medium text-2xl tracking-normal">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Connect shared tenant apps or personal account tools.
          </p>
        </div>
        <TabsList className="w-fit">
          <TabsTrigger value="tenant">Tenant</TabsTrigger>
          <TabsTrigger value="user">User</TabsTrigger>
        </TabsList>
      </div>
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
