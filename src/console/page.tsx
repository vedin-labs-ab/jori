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
import { api } from "../../convex/_generated/api"
import { IntegrationCallbackAlerts } from "./integrations/callback"
import { FullscreenSkeletonLoader } from "./shared/loading"
import { ConsoleShell, PublicConsoleFrame } from "./shell"

export type ActiveOrganization = NonNullable<
  ReturnType<typeof useOrganization>["organization"]
>

export function ConsolePage({
  children,
  chrome = "shell",
  chromeContent = <IntegrationCallbackAlerts />,
  loadingFallback,
}: {
  children: (organization: ActiveOrganization) => ReactNode
  chrome?: "shell" | "none"
  chromeContent?: ReactNode
  loadingFallback?: ReactNode
}) {
  const { isLoaded, isSignedIn } = useAuth()
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth()

  if (!isLoaded) {
    return loadingFallback ?? <FullscreenSkeletonLoader />
  }

  return (
    <ConsoleContent
      chrome={chrome}
      chromeContent={chromeContent}
      isClerkLoaded={isLoaded}
      isConvexAuthenticated={isAuthenticated}
      isConvexAuthLoading={isConvexAuthLoading}
      isSignedIn={isSignedIn}
      loadingFallback={loadingFallback}
    >
      {children}
    </ConsoleContent>
  )
}

function ConsoleContent({
  children,
  chrome,
  chromeContent,
  isClerkLoaded,
  isConvexAuthenticated,
  isConvexAuthLoading,
  isSignedIn,
  loadingFallback,
}: {
  children: (organization: ActiveOrganization) => ReactNode
  chrome: "shell" | "none"
  chromeContent: ReactNode | undefined
  isClerkLoaded: boolean
  isConvexAuthenticated: boolean
  isConvexAuthLoading: boolean
  isSignedIn: boolean | undefined
  loadingFallback: ReactNode | undefined
}) {
  if (!isClerkLoaded) {
    return null
  }

  if (!isSignedIn) {
    return (
      <PublicConsoleFrame
        chromeContent={chromeContent}
        isLoaded={isClerkLoaded}
        isSignedIn={isSignedIn}
      >
        <SignedOutView />
      </PublicConsoleFrame>
    )
  }

  if (isConvexAuthLoading) {
    return loadingFallback ?? <FullscreenSkeletonLoader />
  }

  if (!isConvexAuthenticated) {
    return (
      <PublicConsoleFrame
        chromeContent={chromeContent}
        isLoaded={isClerkLoaded}
        isSignedIn={isSignedIn}
      >
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
    <SignedInView
      chrome={chrome}
      chromeContent={chromeContent}
      loadingFallback={loadingFallback}
    >
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
  chromeContent,
  loadingFallback,
}: {
  children: (organization: ActiveOrganization) => ReactNode
  chrome: "shell" | "none"
  chromeContent: ReactNode | undefined
  loadingFallback: ReactNode | undefined
}) {
  const { isLoaded, organization } = useOrganization()

  if (!isLoaded) {
    return loadingFallback ?? <FullscreenSkeletonLoader />
  }

  if (organization === undefined || organization === null) {
    return (
      <PublicConsoleFrame
        chromeContent={chromeContent}
        isLoaded={isLoaded}
        isSignedIn
      >
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
      {children(organization)}
    </>
  )

  return chrome === "shell" ? (
    <ConsoleShell chromeContent={chromeContent}>{content}</ConsoleShell>
  ) : (
    content
  )
}

function ClerkIdentitySync({ tenantId }: { tenantId: string }) {
  const syncCurrentUser = useAction(api.identity.clerk.syncCurrentUser)

  useEffect(() => {
    void syncCurrentUser({ tenantId }).catch(() => undefined)
  }, [syncCurrentUser, tenantId])

  return null
}
