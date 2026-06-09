import { type ReactNode } from "react"
import { type ConnectionStatus, IntegrationConnection } from "./card"
import { type CreateInstallState } from "./install"

export type AccountConnectionConfig = {
  action: string
  connectedDetail: string
  connectError: string
  description: string
  emptyDetail: string
  icon: ReactNode
  installPath: string
  label: string
  loading: string
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
  status,
  tenantId,
}: {
  config: AccountConnectionConfig
  createInstallState: CreateInstallState
  status: AccountStatus | undefined
  tenantId: string
}) {
  return (
    <IntegrationConnection
      action={config.action}
      connectError={config.connectError}
      createInstallState={createInstallState}
      description={config.description}
      detail={
        status?.status === "active"
          ? config.connectedDetail
          : config.emptyDetail
      }
      headline={getAccountHeadline(status, config.label)}
      icon={config.icon}
      installPath={config.installPath}
      loading={config.loading}
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
