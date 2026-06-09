import {
  CreateOrganization,
  SignInButton,
  SignUpButton,
  useAuth,
  useOrganization,
} from "@clerk/tanstack-react-start"
import { useConvexAuth } from "convex/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IntegrationCallbackAlerts } from "./alerts"
import { OrganizationCard } from "./identity"
import { GitHubConnection } from "./integrations/github"
import {
  GmailConnection,
  GoogleCalendarConnection,
} from "./integrations/google"
import { LinearConnection } from "./integrations/linear"
import {
  MicrosoftCalendarConnection,
  MicrosoftEmailConnection,
} from "./integrations/microsoft"
import { NotionConnection } from "./integrations/notion"
import { SlackConnection } from "./integrations/slack"
import { LoadingMessage } from "./loading"
import { NativePermissionsCard } from "./permissions"
import { useToolPermissions } from "./permissions/controller"
import { ConsoleHeader } from "./shell"
import { SkillsCard } from "./skills"

export function Console() {
  const { isLoaded, isSignedIn } = useAuth()
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-8 px-6 py-8">
      <ConsoleHeader isLoaded={isLoaded} isSignedIn={isSignedIn} />
      <IntegrationCallbackAlerts />

      {!isLoaded ? <LoadingMessage label="Loading" /> : null}

      <ConsoleContent
        isClerkLoaded={isLoaded}
        isConvexAuthenticated={isAuthenticated}
        isConvexAuthLoading={isConvexAuthLoading}
        isSignedIn={isSignedIn}
      />
    </main>
  )
}

function ConsoleContent({
  isClerkLoaded,
  isConvexAuthenticated,
  isConvexAuthLoading,
  isSignedIn,
}: {
  isClerkLoaded: boolean
  isConvexAuthenticated: boolean
  isConvexAuthLoading: boolean
  isSignedIn: boolean | undefined
}) {
  if (!isClerkLoaded) {
    return null
  }

  if (!isSignedIn) {
    return <SignedOutView />
  }

  if (isConvexAuthLoading) {
    return <LoadingMessage label="Loading authentication" />
  }

  if (!isConvexAuthenticated) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Authentication unavailable</AlertTitle>
        <AlertDescription>
          Convex could not validate the active Clerk session.
        </AlertDescription>
      </Alert>
    )
  }

  return <SignedInView />
}

function SignedOutView() {
  return (
    <section className="grid max-w-xl gap-3">
      <h1 className="text-2xl font-medium tracking-normal">
        Bring Milo into your work.
      </h1>
      <p className="text-sm text-muted-foreground">
        Sign up, create an organization, connect a provider, and Milo can
        respond where work is happening.
      </p>
      <div className="flex flex-wrap gap-2">
        <SignUpButton mode="modal">
          <Button>Get started</Button>
        </SignUpButton>
        <SignInButton mode="modal">
          <Button variant="outline">Sign in</Button>
        </SignInButton>
      </div>
    </section>
  )
}

function SignedInView() {
  const { isLoaded, organization } = useOrganization()

  if (!isLoaded) {
    return <LoadingMessage label="Loading organization" />
  }

  if (organization === undefined || organization === null) {
    return (
      <section className="grid max-w-xl gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-medium tracking-normal">
            Create your organization.
          </h1>
          <p className="text-sm text-muted-foreground">
            Milo uses Clerk organizations as tenants.
          </p>
        </div>
        <CreateOrganization />
      </section>
    )
  }

  return <OrganizationConsole organization={organization} />
}

type ActiveOrganization = NonNullable<
  ReturnType<typeof useOrganization>["organization"]
>

function OrganizationConsole({
  organization,
}: {
  organization: ActiveOrganization
}) {
  const permissions = useToolPermissions(organization.id)

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <OrganizationCard organization={organization} />
      <IntegrationTabs permissions={permissions} tenantId={organization.id} />
      <NativePermissionsCard controller={permissions} />
      <SkillsCard tenantId={organization.id} />
    </section>
  )
}

function IntegrationTabs({
  permissions,
  tenantId,
}: {
  permissions: ReturnType<typeof useToolPermissions>
  tenantId: string
}) {
  return (
    <Tabs defaultValue="tenant" className="gap-4 md:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1">
          <h2 className="font-medium text-lg tracking-normal">Integrations</h2>
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
