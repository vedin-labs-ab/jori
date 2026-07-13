import {
  CreateOrganization,
  SignInButton,
  SignUpButton,
  useAuth,
  useOrganization,
} from "@clerk/tanstack-react-start"
import { useAction, useConvexAuth } from "convex/react"
import { type ReactNode, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { api } from "../../convex/_generated/api"
import { IntegrationCallbackToasts } from "./integrations/callback"
import { OnboardingGate } from "./onboarding/gate"
import { localTimezone } from "./shared/time"
import { ConsoleShell } from "./shell"
import { PublicConsoleFrame } from "./shell/public"

export function ConsolePage({
  children,
  chrome = "shell",
  loadingFallback,
}: {
  children: (tenantId: string) => ReactNode
  chrome?: "shell" | "none"
  loadingFallback?: ReactNode
}) {
  const { isLoaded, isSignedIn } = useAuth()
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth()

  if (!isLoaded) {
    return loadingFallback ?? <FullscreenSkeletonLoader />
  }

  return (
    <>
      {chrome === "shell" ? <IntegrationCallbackToasts /> : null}
      <ConsoleContent
        chrome={chrome}
        isConvexAuthenticated={isAuthenticated}
        isConvexAuthLoading={isConvexAuthLoading}
        isSignedIn={isSignedIn}
        loadingFallback={loadingFallback}
      >
        {children}
      </ConsoleContent>
    </>
  )
}

function ConsoleContent({
  children,
  chrome,
  isConvexAuthenticated,
  isConvexAuthLoading,
  isSignedIn,
  loadingFallback,
}: {
  children: (tenantId: string) => ReactNode
  chrome: "shell" | "none"
  isConvexAuthenticated: boolean
  isConvexAuthLoading: boolean
  isSignedIn: boolean | undefined
  loadingFallback: ReactNode | undefined
}) {
  if (!isSignedIn) {
    return (
      <PublicConsoleFrame isSignedIn={false}>
        <SignedOutView />
      </PublicConsoleFrame>
    )
  }

  if (isConvexAuthLoading) {
    return loadingFallback ?? <FullscreenSkeletonLoader />
  }

  if (!isConvexAuthenticated) {
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
    <SignedInView chrome={chrome} loadingFallback={loadingFallback}>
      {children}
    </SignedInView>
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

function SignedInView({
  children,
  chrome,
  loadingFallback,
}: {
  children: (tenantId: string) => ReactNode
  chrome: "shell" | "none"
  loadingFallback: ReactNode | undefined
}) {
  const { isLoaded, organization } = useOrganization()

  if (!isLoaded) {
    return loadingFallback ?? <FullscreenSkeletonLoader />
  }

  if (organization === undefined || organization === null) {
    return (
      <PublicConsoleFrame isSignedIn>
        <section className="grid max-w-xl gap-4">
          <div className="grid gap-1">
            <h1 className="text-2xl font-medium tracking-normal">
              Create your organization.
            </h1>
            <p className="text-sm text-muted-foreground">
              Integrations, automations, and permissions are shared with your
              team through an organization.
            </p>
          </div>
          <CreateOrganization />
        </section>
      </PublicConsoleFrame>
    )
  }

  const content = (
    <>
      <ClerkIdentitySync tenantId={organization.id} />
      <OnboardingGate />
      {children(organization.id)}
    </>
  )

  return chrome === "shell" ? <ConsoleShell>{content}</ConsoleShell> : content
}

function ClerkIdentitySync({ tenantId }: { tenantId: string }) {
  const syncCurrentUser = useAction(api.access.clerk.syncCurrentUser)

  useEffect(() => {
    void syncCurrentUser({
      tenantId,
      timezone: localTimezone(),
    }).catch(() => undefined)
  }, [syncCurrentUser, tenantId])

  return null
}
