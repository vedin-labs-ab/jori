import { useMutation, useQuery } from "convex/react"
import { type ReactNode, useEffect, useState } from "react"
import { CreateOrganizationDialog } from "@/components/auth/organization/create-organization-dialog"
import { UserInvitations } from "@/components/auth/organization/user-invitations"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import {
  activateOrganization,
  useActiveOrganization,
  useAuthenticatedSession,
  useConvexSession,
  useListOrganizations,
} from "@/shared/session/auth"
import { api } from "../../convex/_generated/api"
import { OnboardingGate } from "./context/organization/onboarding/gate"
import { IntegrationCallbackToasts } from "./integrations/callback"
import { localTimezone } from "./shared/time"
import { ConsoleShell } from "./shell"
import { LaunchGate } from "./shell/gate"
import { PublicConsoleFrame } from "./shell/public"

/** Gates a console surface: a stable loader until the session, Convex auth,
 *  and active organization are each known, then exactly one target view. */
export function ConsolePage({
  children,
  chrome = "shell",
  loadingFallback,
}: {
  children: (organizationId: string) => ReactNode
  chrome?: "shell" | "none"
  loadingFallback?: ReactNode
}) {
  const session = useAuthenticatedSession()
  const loader = loadingFallback ?? <FullscreenSkeletonLoader />

  if (session.isPending) {
    return loader
  }

  if (session.data === null || session.data === undefined) {
    return loader
  }

  return (
    <SignedInConsole chrome={chrome} loader={loader}>
      {children}
    </SignedInConsole>
  )
}

/** Resolves the active organization: renders the console once one is active,
 *  activates the first membership when none is, and otherwise offers
 *  creation alongside any pending invitations. */
function SignedInConsole({
  children,
  chrome,
  loader,
}: {
  children: (organizationId: string) => ReactNode
  chrome: "shell" | "none"
  loader: ReactNode
}) {
  const convex = useConvexSession()
  const active = useActiveOrganization()
  const organizations = useListOrganizations()

  if (convex.isLoading || active.isPending || organizations.isPending) {
    return loader
  }

  if (!convex.isAuthenticated) {
    return <ConvexSessionError />
  }

  if (active.data !== null && active.data !== undefined) {
    const content = (
      <>
        {chrome === "shell" ? <IntegrationCallbackToasts /> : null}
        <SessionSync organizationId={active.data.id} />
        <OnboardingGate />
        {children(active.data.id)}
      </>
    )

    return chrome === "shell" ? <ConsoleShell>{content}</ConsoleShell> : content
  }

  const firstOrganizationId = organizations.data?.at(0)?.id

  if (firstOrganizationId !== undefined) {
    return <ActivateOrganization organizationId={firstOrganizationId} />
  }

  return <NoOrganization />
}

/** No organization yet: either this address may open one, or Jori is not open
 *  to it and the useful thing left is the list. */
function NoOrganization() {
  const gate = useQuery(api.access.gate.status)

  if (gate === undefined) {
    return <FullscreenSkeletonLoader />
  }

  if (!gate.allowed) {
    return <LaunchGate email={gate.email} />
  }

  return (
    <PublicConsoleFrame isSignedIn>
      <CreateOrganizationView />
    </PublicConsoleFrame>
  )
}

function ConvexSessionError() {
  return (
    <PublicConsoleFrame isSignedIn>
      <Alert variant="destructive">
        <AlertTitle>Couldn't verify your session</AlertTitle>
        <AlertDescription>
          Sign out and back in, then try again.
        </AlertDescription>
      </Alert>
    </PublicConsoleFrame>
  )
}

/** Sessions start without an active organization; activate the first
 *  membership so the console can scope itself. */
function ActivateOrganization({ organizationId }: { organizationId: string }) {
  useEffect(() => {
    void activateOrganization(organizationId).catch(() => undefined)
  }, [organizationId])

  return <FullscreenSkeletonLoader />
}

function CreateOrganizationView() {
  const [creating, setCreating] = useState(false)

  return (
    // The frame already bounds the column, and the two paths in and out of
    // this screen — make one, or wait for one — read as separate blocks.
    <section className="grid gap-6">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <h1 className="font-medium text-2xl tracking-tight">
            Create your organization.
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Integrations, automations, and permissions are shared with your team
            through an organization.
          </p>
        </div>
        <div>
          <Button onClick={() => setCreating(true)}>Create organization</Button>
        </div>
      </div>
      <UserInvitations />
      <CreateOrganizationDialog onOpenChange={setCreating} open={creating} />
    </section>
  )
}

/** Materializes the signed-in member as a person on console load. */
function SessionSync({ organizationId }: { organizationId: string }) {
  const sync = useMutation(api.persons.account.sync)

  useEffect(() => {
    void sync({
      organizationId,
      timezone: localTimezone(),
    }).catch(() => undefined)
  }, [sync, organizationId])

  return null
}
