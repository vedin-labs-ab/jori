import { ExternalLink, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { IntegrationPermissions } from "../../permissions"
import {
  type ToolPermissionController,
  type ToolProvider,
} from "../../permissions/controller"
import { DisconnectDialog } from "../disconnect"
import { useIntegrationDisconnect } from "../disconnect/controller"
import {
  type CreateInstallState,
  useIntegrationInstall,
} from "../shared/install"
import { type IntegrationLogo, IntegrationSurface } from "./surface"

export type ConnectionStatus = "active" | "paused" | "revoked" | undefined
export type { IntegrationLogo } from "../shared/surface"

export type IntegrationConnectionConfig = {
  action: string
  connectedDetail: string
  connectError: string
  emptyDetail: string
  installPath: string
  label: string
  loading: string
  logo: IntegrationLogo
  provider: Exclude<ToolProvider, "milo">
}

type IntegrationStatus = {
  status: Exclude<ConnectionStatus, undefined>
} | null

export function IntegrationConnection({
  config,
  createInstallState,
  headline,
  permissions,
  status,
  tenantId,
}: {
  config: IntegrationConnectionConfig
  createInstallState: CreateInstallState
  headline: string
  permissions: ToolPermissionController
  status: IntegrationStatus | undefined
  tenantId: string
}) {
  const install = useIntegrationInstall({
    connectError: config.connectError,
    createInstallState,
    installPath: config.installPath,
    tenantId,
  })
  const disconnect = useIntegrationDisconnect({
    provider: config.provider,
    tenantId,
    title: config.label,
  })
  const connectionStatus = status?.status
  const isConnected = connectionStatus === "active"
  const error = install.error ?? disconnect.error

  return (
    <IntegrationSurface
      action={
        isConnected ? (
          <DisconnectDialog
            isDisconnecting={disconnect.isDisconnecting}
            onDisconnect={disconnect.disconnect}
            title={config.label}
          />
        ) : (
          <Button
            type="button"
            onClick={install.connect}
            disabled={install.isConnecting}
          >
            {install.isConnecting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {config.loading}
              </>
            ) : (
              <>
                {config.action}
                <ExternalLink />
              </>
            )}
          </Button>
        )
      }
      description={isConnected ? config.connectedDetail : config.emptyDetail}
      logo={config.logo}
      status={<ConnectionLine headline={headline} status={connectionStatus} />}
      title={config.label}
    >
      {error === undefined && !isConnected ? undefined : (
        <>
          <ConnectionError error={error} />
          {isConnected ? (
            <IntegrationPermissions
              controller={permissions}
              provider={config.provider}
            />
          ) : null}
        </>
      )}
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
