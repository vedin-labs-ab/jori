import { useQuery } from "convex/react"
import { Building2, ShieldAlert } from "lucide-react"
import { Fragment, lazy, type ReactNode, Suspense, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ConsoleEmptyState } from "@/shared/console/list/empty"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import {
  activateOrganization,
  retryOrganizationPreparation,
  useActiveOrganization,
  useAuthenticatedSession,
  useConvexSession,
  useListOrganizations,
} from "@/shared/session/auth"
import { api } from "../../convex/_generated/api"
import { IntegrationCallbackToasts } from "./integrations/callback"
import { loadOnboarding } from "./onboarding/load"
import { readOnboarded } from "./onboarding/state"
import { OrganizationContext, useOrganizationId } from "./organization/context"
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
  if (isResolving(convex, active, organizations)) {
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
      preparation={convex.preparation}
    >
      {children}
    </OrganizationGate>
  )
}

/** Onboarding or the console, for the active organization or for none. The
 *  session prepares the member in an organization as it enters it, before
 *  the page follows, so moving between organizations, or from one's
 *  onboarding to its console, waits for nothing here. Only the first load
 *  can find the member still being prepared. */
function OrganizationGate({
  children,
  chrome,
  creating,
  loader,
  organization,
  preparation,
}: {
  children: (organizationId: string) => ReactNode
  chrome: "shell" | "none"
  creating: boolean
  loader: ReactNode
  organization: { id: string; metadata?: unknown } | undefined
  preparation: ReturnType<typeof useConvexSession>["preparation"]
}) {
  if (preparation === "failed") {
    return <OrganizationSessionFailure />
  }

  const onboarded = readOnboarded(organization?.metadata)
  const onboards = chrome === "shell" && (creating || !onboarded)

  if (organization === undefined || onboards) {
    return (
      <FirstRun
        isPrepared={preparation === "ready"}
        organizationId={onboarded ? undefined : organization?.id}
      />
    )
  }

  if (preparation === "pending") {
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
      {/* The page starts over for another organization: what it had
          selected, opened, or paged to was the last one's. */}
      <Fragment key={organizationId}>{children(organizationId)}</Fragment>
    </OrganizationContext.Provider>
  )

  // The shell is one for every organization: switching swaps what it
  // holds.
  return chrome === "shell" ? <ConsoleShell>{content}</ConsoleShell> : content
}

const Onboarding = lazy(async () => ({
  default: (await loadOnboarding()).Onboarding,
}))

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

  // The loader is the one the gate above shows while it resolves, so a first
  // run waits behind one screen, not two.
  return (
    <Suspense fallback={<FullscreenSkeletonLoader />}>
      <Onboarding isPrepared={isPrepared} organizationId={organizationId} />
    </Suspense>
  )
}

/** Signed in, but the workspace could not be prepared. Trying again mints
 *  the token over, which is what prepares it. */
function OrganizationSessionFailure() {
  return (
    <PublicConsoleFrame isSignedIn>
      <ConsoleEmptyState
        title="Couldn't prepare your workspace"
        description="You're signed in, but workspace setup didn't finish."
        icon={Building2}
        action={
          <Button onClick={retryOrganizationPreparation} variant="outline">
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
