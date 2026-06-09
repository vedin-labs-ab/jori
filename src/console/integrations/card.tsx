import { ExternalLink, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { IntegrationPermissions } from "../permissions"
import {
  type ToolPermissionController,
  type ToolProvider,
} from "../permissions/controller"
import { type CreateInstallState, useIntegrationInstall } from "./install"
import { type IntegrationLogo, IntegrationSurface } from "./surface"

export type ConnectionStatus = "active" | "paused" | "revoked" | undefined
export type { IntegrationLogo } from "./surface"

export function IntegrationConnection({
  action,
  connectError,
  createInstallState,
  detail,
  headline,
  installPath,
  loading,
  logo,
  permissions,
  provider,
  status,
  tenantId,
  title,
}: {
  action: string
  connectError: string
  createInstallState: CreateInstallState
  detail: string
  headline: string
  installPath: string
  loading: string
  logo: IntegrationLogo
  permissions: ToolPermissionController
  provider: Exclude<ToolProvider, "milo">
  status: ConnectionStatus
  tenantId: string
  title: string
}) {
  const install = useIntegrationInstall({
    connectError,
    createInstallState,
    installPath,
    tenantId,
  })
  const isConnected = status === "active"

  return (
    <IntegrationSurface
      action={
        <Button
          type="button"
          variant={isConnected ? "outline" : "default"}
          onClick={install.connect}
          disabled={install.isConnecting}
        >
          {install.isConnecting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {loading}
            </>
          ) : (
            <>
              {isConnected ? "Reconnect" : action}
              <ExternalLink />
            </>
          )}
        </Button>
      }
      description={detail}
      logo={logo}
      status={<ConnectionLine headline={headline} status={status} />}
      title={title}
    >
      <ConnectionError error={install.error} />
      {isConnected ? (
        <div className="border-t pt-4">
          <IntegrationPermissions
            controller={permissions}
            provider={provider}
          />
        </div>
      ) : null}
    </IntegrationSurface>
  )
}

function ConnectionLine({
  headline,
  status,
}: {
  headline: string
  status: ConnectionStatus
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn("size-2 rounded-full", getStatusColorClassName(status))}
      />
      <span>{getStatusLabel(status, headline)}</span>
    </div>
  )
}

function getStatusLabel(status: ConnectionStatus, headline: string) {
  if (status === "active") {
    return `Connected to ${headline}`
  }

  if (status === undefined) {
    return headline
  }

  return `${headline} (${status})`
}

function getStatusColorClassName(status: ConnectionStatus) {
  if (status === "active") {
    return "bg-primary"
  }

  if (status === undefined) {
    return "bg-muted-foreground/40"
  }

  return "bg-warning"
}

function ConnectionError({ error }: { error: string | undefined }) {
  if (error === undefined) {
    return null
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>Connection error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  )
}
