import {
  type ToolPermissionController,
  type ToolProvider,
} from "../permissions/controller"
import { IntegrationConnection, type IntegrationLogo } from "./card"
import { type WorkspaceStatus } from "./headline"
import { type CreateInstallState } from "./install"

export type WorkspaceConnectionConfig = {
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

export function WorkspaceConnection({
  config,
  createInstallState,
  headline,
  permissions,
  status,
  tenantId,
}: {
  config: WorkspaceConnectionConfig
  createInstallState: CreateInstallState
  headline: string
  permissions: ToolPermissionController
  status: WorkspaceStatus | undefined
  tenantId: string
}) {
  return (
    <IntegrationConnection
      action={config.action}
      connectError={config.connectError}
      createInstallState={createInstallState}
      detail={
        status?.status === "active"
          ? config.connectedDetail
          : config.emptyDetail
      }
      headline={headline}
      installPath={config.installPath}
      loading={config.loading}
      logo={config.logo}
      permissions={permissions}
      provider={config.provider}
      status={status?.status}
      tenantId={tenantId}
      title={config.label}
    />
  )
}
