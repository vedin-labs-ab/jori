import { type ToolSurface } from "@contracts/permissions"
import { ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RevealArrow } from "@/shared/console/dot"
import { type ToolPermissionController } from "../../permissions/controller"
import { PermissionSection } from "../../permissions/section"
import { DisconnectDialog } from "../disconnect"
import { useIntegrationDisconnect } from "../disconnect/controller"
import { integrationsRouteFor } from "../routes"
import { type IntegrationCardStatus } from "./headline"
import { useIntegrationInstall } from "./install"
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
  integration: Exclude<ToolSurface, "jori">
}

type IntegrationStatus = {
  status: Exclude<IntegrationCardStatus, undefined>
  url?: string
} | null

export function IntegrationCard({
  config,
  headline,
  permissions,
  status,
  organizationId,
}: {
  config: IntegrationCardConfig
  headline: string
  permissions: ToolPermissionController
  status: IntegrationStatus | undefined
  organizationId: string
}) {
  const install = useIntegrationInstall({
    connectError: config.connectError,
    installPath: config.installPath,
    integration: config.integration,
    organizationId,
    // Come back to the tab the card lives on, not whichever one is default.
    returnPath: integrationsRouteFor([config.integration]),
  })
  const disconnect = useIntegrationDisconnect({
    integration: config.integration,
    organizationId,
    title: config.label,
  })
  const isConnected = status?.status === "active"

  return (
    <IntegrationCardSurface
      action={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={isConnected ? "outline" : "default"}
            onClick={install.connect}
            disabled={install.isConnecting || disconnect.isDisconnecting}
          >
            <InstallContent
              config={config}
              pending={install.isConnecting}
              reconnect={isConnected || status?.status === "expired"}
            />
          </Button>
          {isConnected ? (
            <DisconnectDialog
              disabled={install.isConnecting}
              isDisconnecting={disconnect.isDisconnecting}
              onDisconnect={disconnect.disconnect}
              title={config.label}
            />
          ) : null}
        </div>
      }
      description={isConnected ? config.connectedDetail : config.emptyDetail}
      logo={config.logo}
      status={<IntegrationStatusLine headline={headline} status={status} />}
      title={config.label}
    >
      {isConnected ? (
        <PermissionSection
          controller={permissions}
          emptyLabel="No permissions to configure yet."
          surface={config.integration}
          title="Permissions"
        />
      ) : undefined}
    </IntegrationCardSurface>
  )
}

function InstallContent({
  config,
  pending,
  reconnect,
}: {
  config: IntegrationCardConfig
  pending: boolean
  reconnect: boolean
}) {
  const label = pending
    ? config.loading
    : reconnect
      ? "Reconnect"
      : config.action
  const labels = [...new Set([config.action, config.loading, "Reconnect"])]

  return (
    <>
      <span className="inline-grid">
        {labels.map((value) => (
          <span
            aria-hidden
            className="invisible col-start-1 row-start-1"
            key={value}
          >
            {value}
          </span>
        ))}
        <span className="col-start-1 row-start-1">{label}</span>
      </span>
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <ExternalLink className="size-3.5" />
      )}
    </>
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
  const href = status?.url

  return (
    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          status?.status === "active" ? "bg-primary" : "bg-muted-foreground/40"
        )}
      />
      {href === undefined ? (
        <span>{label}</span>
      ) : (
        <a
          className="group/reveal inline-flex items-center gap-0.5 rounded-sm transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          href={href}
          rel="noreferrer"
          target="_blank"
        >
          <span>{label}</span>
          <RevealArrow />
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
    return "Checking…"
  }

  if (status === null || status.status === "disconnected") {
    return "Not connected"
  }

  if (status.status === "expired") {
    return "Access expired"
  }

  return headline
}
