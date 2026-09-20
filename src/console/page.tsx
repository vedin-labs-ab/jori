import { useQuery } from "convex/react"
import { ShieldAlert } from "lucide-react"
import { type ReactNode, useEffect } from "react"
import { ConsoleEmptyState } from "@/shared/console/list/empty"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import {
  activateOrganization,
  useActiveOrganization,
  useAuthenticatedSession,
  useConvexSession,
  useListOrganizations,
} from "@/shared/session/auth"
import { api } from "../../convex/_generated/api"
import { IntegrationCallbackToasts } from "./integrations/callback"
import { Onboarding, OnboardingHandoffStep } from "./onboarding"
import { readHandoff } from "./onboarding/handoff"
import { readOnboarded } from "./onboarding/state"
import { OrganizationContext, useOrganizationId } from "./organization/context"
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
  // Creating an organization remounts the console from here down. The step
  // that did it stands in for the loader, so the screen never blanks.
  const handoff = readHandoff()
  const loader =
    handoff === undefined ? (
      (loadingFallback ?? <FullscreenSkeletonLoader />)
    ) : (
      <OnboardingHandoffStep handoff={handoff} />
    )

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

/** Resolves the active organization: renders the console once one is active,
 *  activates the first membership when none is, and otherwise offers
 *  creation alongside any pending invitations. */
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
        {() => (
          <OrganizationConsole
            chrome={chrome}
            creating={creating}
            onboarded={readOnboarded(active.data?.metadata)}
            organizationId={organizationId}
          >
            {children}
          </OrganizationConsole>
        )}
      </OrganizationSession>
    )
  }

  const firstOrganizationId = organizations.data?.at(0)?.id

  if (firstOrganizationId !== undefined) {
    return <ActivateOrganization organizationId={firstOrganizationId} />
  }

  return <NoOrganization />
}

/** The console for an active organization. Onboarding stands in for it,
 *  chrome and page alike: this organization's until it has been through it,
 *  and then a new one's where the page asks for that. */
function OrganizationConsole({
  children,
  chrome,
  creating,
  onboarded,
  organizationId,
}: {
  children: (organizationId: string) => ReactNode
  chrome: "shell" | "none"
  creating: boolean
  onboarded: boolean
  organizationId: string
}) {
  const onboarding = chrome === "shell" && (creating || !onboarded)
  const content = (
    <OrganizationContext.Provider value={organizationId}>
      {chrome === "shell" ? <IntegrationCallbackToasts /> : null}
      {onboarding ? (
        <Onboarding organizationId={onboarded ? undefined : organizationId} />
      ) : (
        children(organizationId)
      )}
    </OrganizationContext.Provider>
  )

  return chrome === "shell" && !onboarding ? (
    <ConsoleShell>{content}</ConsoleShell>
  ) : (
    content
  )
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

  return <Onboarding />
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
