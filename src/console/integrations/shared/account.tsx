import {
  type ToolPermissionController,
  type ToolProvider,
} from "../../permissions/controller"
import {
  type ConnectionStatus,
  IntegrationConnection,
  type IntegrationLogo,
} from "../shared/card"
import { type CreateInstallState } from "../shared/install"

export type AccountConnectionConfig = {
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

type AccountStatus = {
  accountId: string
  email?: string
  name?: string
  status: Exclude<ConnectionStatus, undefined>
} | null

export function AccountConnection({
  config,
  createInstallState,
  permissions,
  status,
  tenantId,
}: {
  config: AccountConnectionConfig
  createInstallState: CreateInstallState
  permissions: ToolPermissionController
  status: AccountStatus | undefined
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
      headline={getAccountHeadline(status, config.label)}
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

function getAccountHeadline(status: AccountStatus | undefined, label: string) {
  if (status === undefined) {
    return `Checking ${label}`
  }

  return (
    status?.name ??
    status?.email ??
    status?.accountId ??
    `No ${label} connected`
  )
}
