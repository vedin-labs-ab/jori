import { Link } from "@tanstack/react-router"
import { useAction, useQuery } from "convex/react"
import { AlertTriangle, ArrowLeft } from "lucide-react"
import { type ReactNode, useCallback, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AppFrame } from "@/shared/apps/frame"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { api } from "../../../../convex/_generated/api"
import { ConsolePage } from "../../page"
import { type AppDetail } from "../types"
import { memberAppUrl } from "./fragment"
import { AppLinks } from "./links"
import { AppRailLabel, appRailButtonClassName } from "./rail"

type AppId = AppDetail["appId"]

export function AppView({
  appId,
  fallback,
}: {
  appId: AppId
  fallback?: ReactNode
}) {
  return (
    <ConsolePage chrome="none" loadingFallback={<AppViewLoading />}>
      {(organizationId) => (
        <AppViewContent
          appId={appId}
          fallback={fallback}
          organizationId={organizationId}
        />
      )}
    </ConsolePage>
  )
}

function AppViewContent({
  appId,
  fallback,
  organizationId,
}: {
  appId: AppId
  fallback: ReactNode | undefined
  organizationId: string
}) {
  const appResult = useQuery(api.apps.console.get, {
    organizationId,
    appId,
  })

  if (appResult === undefined) {
    return <AppViewLoading />
  }

  if (appResult.status === "unauthorized") {
    if (fallback !== undefined) {
      return fallback
    }

    return (
      <AppFullscreenShell>
        <Alert variant="destructive">
          <AlertTitle>Could not load app</AlertTitle>
          <AlertDescription>{appResult.message}</AlertDescription>
        </Alert>
      </AppFullscreenShell>
    )
  }

  if (appResult.status === "not_found" || appResult.app === null) {
    if (fallback !== undefined) {
      return fallback
    }

    return (
      <AppFullscreenShell>
        <Alert>
          <AlertTriangle />
          <AlertTitle>App not found</AlertTitle>
          <AlertDescription>
            The app may have been deleted or belongs to another organization.
          </AlertDescription>
        </Alert>
      </AppFullscreenShell>
    )
  }

  return (
    <PublishedAppView app={appResult.app} organizationId={organizationId} />
  )
}

function AppViewLoading() {
  return <FullscreenSkeletonLoader aria-label="Loading app" />
}

function PublishedAppView({
  app,
  organizationId,
}: {
  app: AppDetail
  organizationId: string
}) {
  useMemberAppUrl()
  const createSession = useAction(api.apps.actions.createSession)
  const mintSession = useCallback(
    () => createSession({ organizationId, appId: app.appId }),
    [app.appId, createSession, organizationId]
  )

  return (
    <AppFullscreenShell>
      <AppLinks appId={app.appId} organizationId={organizationId} />
      <AppFrame
        appId={app.appId}
        mintSession={mintSession}
        title={app.title}
        variant="fullscreen"
      />
    </AppFullscreenShell>
  )
}

function useMemberAppUrl() {
  useEffect(() => {
    const url = memberAppUrl(window.location)

    if (url !== null) {
      window.history.replaceState(window.history.state, "", url)
    }
  }, [])
}

function AppFullscreenShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-svh flex-col bg-background">
      <AppBackButton />
      {children}
    </main>
  )
}

function AppBackButton() {
  return (
    <div className="group/action absolute top-4 left-0 z-30 w-28">
      <Button
        asChild
        className={appRailButtonClassName}
        size="sm"
        variant="secondary"
      >
        <Link to="/apps">
          <ArrowLeft />
          <AppRailLabel>Back</AppRailLabel>
        </Link>
      </Button>
    </div>
  )
}
