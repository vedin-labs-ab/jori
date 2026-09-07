import { useMutation, useQuery } from "convex/react"
import { type ReactNode, useEffect, useState } from "react"
import { UserInvitations } from "@/components/auth/organization/user-invitations"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { showErrorToast } from "@/shared/console/error"
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
import { OrganizationContext, useOrganizationId } from "./organization/context"
import { CreateOrganizationDialog } from "./organization/create"
import { takeTimezone } from "./organization/pending"
import { OrganizationSession } from "./organization/session"
import { ConsoleShell } from "./shell"
import { LaunchGate } from "./shell/gate"
import { PublicConsoleFrame } from "./shell/public"

/**
 * Gates a console surface. A page composes this without knowing whether it
 * is the outermost console on screen: inside a frame that already resolved
 * an organization it is a pass-through, so a material page nested in a
 * section frame reuses that chrome rather than mounting a second one.
 */
export function ConsolePage(props: {
  children: (organizationId: string) => ReactNode
  chrome?: "shell" | "none"
  loadingFallback?: ReactNode
}) {
  const framedOrganizationId = useOrganizationId()

  return framedOrganizationId === undefined ? (
    <UnframedConsolePage {...props} />
  ) : (
    props.children(framedOrganizationId)
  )
}

/** Gates a console surface: a stable loader until the session, Convex auth,
 *  and active organization are each known, then exactly one target view.
 *  Every gate query mounts here together so their round-trips overlap —
 *  mounting the organization queries only after the session resolved used
 *  to serialize the whole chain and doubled the time behind the loader. */
function UnframedConsolePage({
  children,
  chrome = "shell",
  loadingFallback,
}: {
  children: (organizationId: string) => ReactNode
  chrome?: "shell" | "none"
  loadingFallback?: ReactNode
}) {
  const session = useAuthenticatedSession()
  const convex = useConvexSession()
  const active = useActiveOrganization()
  const organizations = useListOrganizations()
  const loader = loadingFallback ?? <FullscreenSkeletonLoader />

  if (
    session.isPending ||
    session.data === null ||
    session.data === undefined
  ) {
    return loader
  }

  return (
    <SignedInConsole
      active={active}
      chrome={chrome}
      convex={convex}
      loader={loader}
      organizations={organizations}
    >
      {children}
    </SignedInConsole>
  )
}

/** Resolves the active organization: renders the console once one is active,
 *  activates the first membership when none is, and otherwise offers
 *  creation alongside any pending invitations. */
function SignedInConsole({
  active,
  children,
  chrome,
  convex,
  loader,
  organizations,
}: {
  active: ReturnType<typeof useActiveOrganization>
  children: (organizationId: string) => ReactNode
  chrome: "shell" | "none"
  convex: ReturnType<typeof useConvexSession>
  loader: ReactNode
  organizations: ReturnType<typeof useListOrganizations>
}) {
  if (convex.isLoading || active.isPending || organizations.isPending) {
    return loader
  }

  if (!convex.isAuthenticated) {
    return <ConvexSessionError />
  }

  if (active.data !== null && active.data !== undefined) {
    const organizationId = active.data.id

    return (
      <OrganizationSession
        key={organizationId}
        loader={loader}
        organizationId={organizationId}
      >
        {() => {
          const content = (
            <OrganizationContext.Provider value={organizationId}>
              {chrome === "shell" ? <IntegrationCallbackToasts /> : null}
              <DeclareTimezone organizationId={organizationId} />
              <OnboardingGate />
              {children(organizationId)}
            </OrganizationContext.Provider>
          )

          return chrome === "shell" ? (
            <ConsoleShell>{content}</ConsoleShell>
          ) : (
            content
          )
        }}
      </OrganizationSession>
    )
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
            Integrations, jobs, and permissions are shared with your team
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

/** Spends the zone chosen while creating this organization. It waits for
 *  this load because only now does the session token carry the claim the
 *  mutation is scoped to; an undeclared organization counts its days in
 *  UTC, so a failure is worth saying but not worth stopping for. */
function DeclareTimezone({ organizationId }: { organizationId: string }) {
  const declareTimezone = useMutation(api.organization.profile.declareTimezone)

  useEffect(() => {
    const timezone = takeTimezone(organizationId)

    if (timezone === null) {
      return
    }

    void declareTimezone({ organizationId, timezone }).catch(
      (error: unknown) => {
        showErrorToast(
          error,
          "Couldn't save your timezone. Set it from the Context page."
        )
      }
    )
  }, [declareTimezone, organizationId])

  return null
}
