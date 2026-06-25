import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConsolePage } from "../page"
import { NativePermissionsCard } from "../permissions"
import { useToolPermissions } from "../permissions/controller"
import { ConsoleContentGrid } from "../shared/layout"
import { GitHubIntegration } from "./providers/github"
import {
  GmailIntegration,
  GoogleCalendarIntegration,
  GoogleDriveIntegration,
} from "./providers/google"
import { LinearIntegration } from "./providers/linear"
import {
  MicrosoftCalendarIntegration,
  MicrosoftEmailIntegration,
} from "./providers/microsoft"
import { NotionIntegration } from "./providers/notion"
import { SlackIntegration } from "./providers/slack"

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
          <SlackIntegration permissions={permissions} tenantId={tenantId} />
          <LinearIntegration permissions={permissions} tenantId={tenantId} />
          <GitHubIntegration permissions={permissions} tenantId={tenantId} />
          <NotionIntegration permissions={permissions} tenantId={tenantId} />
          <GoogleDriveIntegration
            permissions={permissions}
            tenantId={tenantId}
          />
          <NativePermissionsCard controller={permissions} />
        </ConsoleContentGrid>
      </TabsContent>
      <TabsContent value="user" asChild>
        <ConsoleContentGrid className="md:grid-cols-2">
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
