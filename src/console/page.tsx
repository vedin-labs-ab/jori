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
import { LoadingMessage } from "./loading"
import { ConsoleShell, PublicConsoleFrame } from "./shell"

export type ActiveOrganization = NonNullable<
  ReturnType<typeof useOrganization>["organization"]
>

export function ConsolePage({
  children,
}: {
  children: (organization: ActiveOrganization) => ReactNode
}) {
  const { isLoaded, isSignedIn } = useAuth()
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth()

  if (!isLoaded) {
    return (
      <PublicConsoleFrame isLoaded={isLoaded} isSignedIn={isSignedIn}>
        <LoadingMessage label="Loading" />
      </PublicConsoleFrame>
    )
  }

  return (
    <ConsoleContent
      isClerkLoaded={isLoaded}
      isConvexAuthenticated={isAuthenticated}
      isConvexAuthLoading={isConvexAuthLoading}
      isSignedIn={isSignedIn}
    >
      {children}
    </ConsoleContent>
  )
}

function ConsoleContent({
  children,
  isClerkLoaded,
  isConvexAuthenticated,
  isConvexAuthLoading,
  isSignedIn,
}: {
  children: (organization: ActiveOrganization) => ReactNode
  isClerkLoaded: boolean
  isConvexAuthenticated: boolean
  isConvexAuthLoading: boolean
  isSignedIn: boolean | undefined
}) {
  if (!isClerkLoaded) {
    return null
  }

  if (!isSignedIn) {
    return (
      <PublicConsoleFrame isLoaded={isClerkLoaded} isSignedIn={isSignedIn}>
        <SignedOutView />
      </PublicConsoleFrame>
    )
  }

  if (isConvexAuthLoading) {
    return (
      <PublicConsoleFrame isLoaded={isClerkLoaded} isSignedIn={isSignedIn}>
        <LoadingMessage label="Signing you in" />
      </PublicConsoleFrame>
    )
  }

  if (!isConvexAuthenticated) {
    return (
      <PublicConsoleFrame isLoaded={isClerkLoaded} isSignedIn={isSignedIn}>
        <Alert variant="destructive">
          <AlertTitle>Couldn't verify your session</AlertTitle>
          <AlertDescription>
            Sign out and back in, then try again.
          </AlertDescription>
        </Alert>
      </PublicConsoleFrame>
    )
  }

  return <SignedInView>{children}</SignedInView>
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
}: {
  children: (organization: ActiveOrganization) => ReactNode
}) {
  const { isLoaded, organization } = useOrganization()

  if (!isLoaded) {
    return (
      <PublicConsoleFrame isLoaded={isLoaded} isSignedIn>
        <LoadingMessage label="Loading your organization" />
      </PublicConsoleFrame>
    )
  }

  if (organization === undefined || organization === null) {
    return (
      <PublicConsoleFrame isLoaded={isLoaded} isSignedIn>
        <section className="grid max-w-xl gap-4">
          <div className="grid gap-1">
            <h1 className="text-2xl font-medium tracking-normal">
              Create your organization.
            </h1>
            <p className="text-sm text-muted-foreground">
              Integrations, schedules, and permissions are shared with your team
              through an organization.
            </p>
          </div>
          <CreateOrganization />
        </section>
      </PublicConsoleFrame>
    )
  }

  return (
    <>
      <ClerkIdentitySync tenantId={organization.id} />
      <ConsoleShell>{children(organization)}</ConsoleShell>
    </>
  )
}

function ClerkIdentitySync({ tenantId }: { tenantId: string }) {
  const syncCurrentUser = useAction(api.identity.clerk.syncCurrentUser)

  useEffect(() => {
    void syncCurrentUser({ tenantId }).catch(() => undefined)
  }, [syncCurrentUser, tenantId])

  return null
}
