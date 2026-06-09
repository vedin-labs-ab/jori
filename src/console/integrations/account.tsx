import { type ReactNode } from "react"
import {
  type ConnectionStatus,
  IntegrationActionLabel,
  IntegrationConnectionCard,
} from "./card"
import { useIntegrationInstall } from "./install"

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
  createInstallState: (args: {
    tenantId: string
    returnUrl: string
  }) => Promise<string>
  status: AccountStatus | undefined
  tenantId: string
}) {
  const install = useIntegrationInstall({
    connectError: config.connectError,
    createInstallState,
    installPath: config.installPath,
    tenantId,
  })

  return (
    <IntegrationConnectionCard
      title={config.label}
      description={config.description}
      status={status?.status}
      headline={getAccountHeadline(status, config.label)}
      detail={
        status?.status === "active"
          ? config.connectedDetail
          : config.emptyDetail
      }
      icon={config.icon}
      error={install.error}
      actionLabel={
        <IntegrationActionLabel
          action={config.action}
          isConnecting={install.isConnecting}
          loading={config.loading}
        />
      }
      isConnecting={install.isConnecting}
      onConnect={install.connect}
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
