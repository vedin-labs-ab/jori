import { useQuery } from "convex/react"
import { Building2, ShieldAlert } from "lucide-react"
import { type ReactNode, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ConsoleEmptyState } from "@/shared/console/list/empty"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import {
  activateOrganization,
  useActiveOrganization,
  useAuthenticatedSession,
  useConvexSession,
  useListOrganizations,
  useOrganizationSwitching,
} from "@/shared/session/auth"
import { api } from "../../convex/_generated/api"
import { IntegrationCallbackToasts } from "./integrations/callback"
import { Onboarding } from "./onboarding"
import { readOnboarded } from "./onboarding/state"
import { OrganizationContext, useOrganizationId } from "./organization/context"
import { useOrganizationSession } from "./organization/session"
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
  /** Starts a new organization's onboarding in place of the page. */
  creating?: boolean
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
  creating = false,
  loadingFallback,
}: {
  children: (organizationId: string) => ReactNode
  chrome?: "shell" | "none"
  creating?: boolean
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
      creating={creating}
      loader={loader}
      organizations={organizations}
    >
      {children}
    </SignedInConsole>
  )
}

/** Resolves the active organization: renders the console once one is active
 *  and onboarded, activates the first membership when none is active, and
 *  otherwise onboards.
 *
 *  Onboarding stands in for the console, chrome and page alike: for a person
 *  with no organization, for one the page says to start, and for an active
 *  one that has not been through it. It is rendered from this one place, so
 *  it stays mounted while the organization it is about comes into being. */
function SignedInConsole({
  active,
  children,
  chrome,
  convex,
  creating,
  loader,
  organizations,
}: {
  active: ReturnType<typeof useActiveOrganization>
  children: (organizationId: string) => ReactNode
  chrome: "shell" | "none"
  convex: ReturnType<typeof useConvexSession>
  creating: boolean
  loader: ReactNode
  organizations: ReturnType<typeof useListOrganizations>
}) {
  const switching = useOrganizationSwitching()

  if (isResolving(convex, active, organizations) || switching) {
    return loader
  }

  if (!convex.isAuthenticated) {
    return <ConvexSessionError />
  }

  const organization = active.data ?? undefined
  const firstOrganizationId = organizations.data?.at(0)?.id

  if (organization === undefined && firstOrganizationId !== undefined) {
    return <ActivateOrganization organizationId={firstOrganizationId} />
  }

  return (
    <OrganizationGate
      chrome={chrome}
      creating={creating}
      loader={loader}
      organization={organization}
    >
      {children}
    </OrganizationGate>
  )
}

/** Onboarding or the console, for the active organization or for none. The
 *  member is prepared in the organization once, here above both of its
 *  views, so going from its onboarding to its console waits for nothing a
 *  second time. */
function OrganizationGate({
  children,
  chrome,
  creating,
  loader,
  organization,
}: {
  children: (organizationId: string) => ReactNode
  chrome: "shell" | "none"
  creating: boolean
  loader: ReactNode
  organization: { id: string; metadata?: unknown } | undefined
}) {
  const session = useOrganizationSession(organization?.id)

  if (session.status === "failed") {
    return <OrganizationSessionFailure onRetry={session.retry} />
  }

  const onboarded = readOnboarded(organization?.metadata)
  const onboards = chrome === "shell" && (creating || !onboarded)

  if (organization === undefined || onboards) {
    return (
      <FirstRun
        isPrepared={session.status === "ready"}
        organizationId={onboarded ? undefined : organization?.id}
      />
    )
  }

  if (session.status === "pending") {
    return loader
  }

  return (
    <OrganizationConsole chrome={chrome} organizationId={organization.id}>
      {children}
    </OrganizationConsole>
  )
}

/** The console for a prepared, onboarded organization. */
function OrganizationConsole({
  children,
  chrome,
  organizationId,
}: {
  children: (organizationId: string) => ReactNode
  chrome: "shell" | "none"
  organizationId: string
}) {
  const content = (
    <OrganizationContext.Provider value={organizationId}>
      {chrome === "shell" ? <IntegrationCallbackToasts /> : null}
      {children(organizationId)}
    </OrganizationContext.Provider>
  )

  return chrome === "shell" ? (
    // Keyed, so one organization's console never carries into the next.
    <ConsoleShell key={organizationId}>{content}</ConsoleShell>
  ) : (
    content
  )
}

function isResolving(
  convex: ReturnType<typeof useConvexSession>,
  active: ReturnType<typeof useActiveOrganization>,
  organizations: ReturnType<typeof useListOrganizations>
) {
  return convex.isLoading || active.isPending || organizations.isPending
}

/** Onboarding, behind the one question that comes before it: a person with
 *  no organization may open one only if Jori is open to their address, and
 *  otherwise the useful thing left is the list. Anyone who already has an
 *  organization is past that. */
function FirstRun({
  isPrepared,
  organizationId,
}: {
  isPrepared: boolean
  organizationId: string | undefined
}) {
  const hasOrganization =
    (useListOrganizations().data?.length ?? 0) > 0 ||
    organizationId !== undefined
  const gate = useQuery(api.access.gate.status, hasOrganization ? "skip" : {})

  if (!hasOrganization && gate === undefined) {
    return <FullscreenSkeletonLoader />
  }

  if (!hasOrganization && gate?.allowed === false) {
    return <LaunchGate email={gate.email} />
  }

  return <Onboarding isPrepared={isPrepared} organizationId={organizationId} />
}

/** Signed in, but the workspace could not be prepared. */
function OrganizationSessionFailure({ onRetry }: { onRetry: () => void }) {
  return (
    <PublicConsoleFrame isSignedIn>
      <ConsoleEmptyState
        title="Couldn't prepare your workspace"
        description="You're signed in, but workspace setup didn't finish."
        icon={Building2}
        action={
          <Button onClick={onRetry} variant="outline">
            Try again
          </Button>
        }
      />
    </PublicConsoleFrame>
  )
}

function ConvexSessionError() {
  return (
    <PublicConsoleFrame isSignedIn>
      <ConsoleEmptyState
        title="Couldn't verify your session"
        description="Sign out and back in, then try again."
        icon={ShieldAlert}
      />
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
