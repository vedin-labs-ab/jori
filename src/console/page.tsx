import { Link } from "@tanstack/react-router"
import { useConvexAuth, useMutation } from "convex/react"
import { type ReactNode, useEffect, useState } from "react"
import { CreateOrganizationDialog } from "@/components/auth/organization/create-organization-dialog"
import { UserInvitations } from "@/components/auth/organization/user-invitations"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { activateOrganization, authClient } from "@/shared/session/auth"
import { api } from "../../convex/_generated/api"
import { OnboardingGate } from "./context/organization/onboarding/gate"
import { IntegrationCallbackToasts } from "./integrations/callback"
import { localTimezone } from "./shared/time"
import { ConsoleShell } from "./shell"
import { PublicConsoleFrame } from "./shell/public"

export function ConsolePage({
  children,
  chrome = "shell",
  loadingFallback,
}: {
  children: (organizationId: string) => ReactNode
  chrome?: "shell" | "none"
  loadingFallback?: ReactNode
}) {
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth()
  const loader = loadingFallback ?? <FullscreenSkeletonLoader />

  if (isSessionPending) {
    return loader
  }

  if (session === null) {
    return (
      <PublicConsoleFrame isSignedIn={false}>
        <SignedOutView />
      </PublicConsoleFrame>
    )
  }

  if (isConvexAuthLoading) {
    return loader
  }

  if (!isAuthenticated) {
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

  return (
    <>
      {chrome === "shell" ? <IntegrationCallbackToasts /> : null}
      <OrganizationBoundary chrome={chrome} loader={loader}>
        {children}
      </OrganizationBoundary>
    </>
  )
}

function SignedOutView() {
  return (
    <section className="grid max-w-xl gap-3">
      <h1 className="text-2xl font-medium tracking-normal">
        Bring Milo into your work.
      </h1>
      <p className="text-sm text-muted-foreground">
        Create an organization, connect your tools, and Milo starts helping
        where your team already works.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/auth/sign-in">Get started</Link>
        </Button>
      </div>
    </section>
  )
}

/** Resolves the active organization: renders the console once one is active,
 *  activates the first membership when none is, and otherwise offers
 *  creation alongside any pending invitations. */
function OrganizationBoundary({
  children,
  chrome,
  loader,
}: {
  children: (organizationId: string) => ReactNode
  chrome: "shell" | "none"
  loader: ReactNode
}) {
  const { data: active, isPending: isActivePending } =
    authClient.useActiveOrganization()
  const { data: organizations, isPending: isListPending } =
    authClient.useListOrganizations()

  if (isActivePending || isListPending) {
    return loader
  }

  if (active !== null && active !== undefined) {
    const content = (
      <>
        <SessionSync organizationId={active.id} />
        <OnboardingGate />
        {children(active.id)}
      </>
    )

    return chrome === "shell" ? <ConsoleShell>{content}</ConsoleShell> : content
  }

  const firstOrganizationId = organizations?.at(0)?.id

  if (firstOrganizationId !== undefined) {
    return <ActivateOrganization organizationId={firstOrganizationId} />
  }

  return (
    <PublicConsoleFrame isSignedIn>
      <CreateOrganizationView />
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
    <section className="grid max-w-xl gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl font-medium tracking-normal">
          Create your organization.
        </h1>
        <p className="text-sm text-muted-foreground">
          Integrations, automations, and permissions are shared with your team
          through an organization.
        </p>
      </div>
      <div>
        <Button onClick={() => setCreating(true)}>Create organization</Button>
      </div>
      <CreateOrganizationDialog onOpenChange={setCreating} open={creating} />
      <UserInvitations />
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
