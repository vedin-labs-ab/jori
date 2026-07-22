import { ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  type ToolPermissionController,
  type ToolSurface,
} from "../../permissions/controller"
import { PermissionSection } from "../../permissions/section"
import { RevealArrow } from "../../shared/dot"
import { DisconnectDialog } from "../disconnect"
import { useIntegrationDisconnect } from "../disconnect/controller"
import { type IntegrationCardStatus } from "./headline"
import { type CreateInstallState, useIntegrationInstall } from "./install"
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
  organizationId,
}: {
  config: IntegrationCardConfig
  createInstallState: CreateInstallState
  headline: string
  permissions: ToolPermissionController
  status: IntegrationStatus | undefined
  organizationId: string
}) {
  const install = useIntegrationInstall({
    connectError: config.connectError,
    createInstallState,
    installPath: config.installPath,
    organizationId,
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
          "size-1.5 rounded-full",
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
