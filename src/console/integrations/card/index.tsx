import { ArrowUpRight, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  type ToolPermissionController,
  type ToolSurface,
} from "../../permissions/controller"
import { DisconnectDialog } from "../disconnect"
import { useIntegrationDisconnect } from "../disconnect/controller"
import { type IntegrationCardStatus } from "./headline"
import { type CreateInstallState, useIntegrationInstall } from "./install"
import { IntegrationPermissions } from "./permissions"
import { IntegrationCardSurface, type SurfaceLogo } from "./surface"

export type IntegrationCardConfig = {
  action: string
  connectedDetail: string
  connectError: string
  emptyDetail: string
  installPath: string
  label: string
  loading: string
  logo: SurfaceLogo
  integration: Exclude<ToolSurface, "milo">
}

type IntegrationStatus = {
  status: Exclude<IntegrationCardStatus, undefined>
  url?: string
} | null

export function IntegrationCard({
  config,
  createInstallState,
  headline,
  permissions,
  status,
  tenantId,
}: {
  config: IntegrationCardConfig
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
    integration: config.integration,
    tenantId,
    title: config.label,
  })
  const isConnected = status?.status === "active"

  return (
    <IntegrationCardSurface
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
      status={<IntegrationStatusLine headline={headline} status={status} />}
      title={config.label}
    >
      {isConnected ? (
        <IntegrationPermissions
          controller={permissions}
          surface={config.integration}
        />
      ) : undefined}
    </IntegrationCardSurface>
  )
}

function IntegrationStatusLine({
  headline,
  status,
}: {
  headline: string
  status: IntegrationStatus | undefined
}) {
  const label = getStatusLabel(status, headline)
  const href = getStatusHref(status)

  return (
    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", getStatusDotClassName(status))}
      />
      {href === undefined ? (
        <span>{label}</span>
      ) : (
        <a
          className="group/status-link inline-flex items-center gap-0.5 rounded-sm underline-offset-4 transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          href={href}
          rel="noreferrer"
          target="_blank"
        >
          <span>{label}</span>
          <ArrowUpRight
            aria-hidden="true"
            className="size-3 -translate-x-1 opacity-0 transition-all duration-200 ease-out group-hover/status-link:translate-x-0 group-hover/status-link:opacity-100 group-focus-visible/status-link:translate-x-0 group-focus-visible/status-link:opacity-100"
          />
        </a>
      )}
    </div>
  )
}

function getStatusLabel(
  status: IntegrationStatus | undefined,
  headline: string
) {
  if (status === undefined) {
    return headline
  }

  if (status === null || status.status === "disconnected") {
    return "Not connected"
  }

  if (status.status === "expired") {
    return "Access expired"
  }

  return headline
}

function getStatusHref(status: IntegrationStatus | undefined) {
  if (status === undefined || status === null) {
    return undefined
  }

  return status.url
}

function getStatusDotClassName(status: IntegrationStatus | undefined) {
  if (status?.status === "active") {
    return "bg-primary"
  }

  return "bg-muted-foreground/40"
}
