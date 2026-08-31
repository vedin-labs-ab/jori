import { useQuery } from "convex/react"
import { type ToolPermissionController } from "../permissions/controller"
import { IntegrationCard } from "./card"
import { getAccountHeadline, getWorkspaceHeadline } from "./card/headline"
import { type ProviderDefinition, type ProviderStatus } from "./catalog"

export function IntegrationProvider({
  organizationId,
  permissions,
  provider,
}: {
  organizationId: string
  permissions: ToolPermissionController
  provider: ProviderDefinition
}) {
  const status = useQuery(provider.status, { organizationId })

  return (
    <IntegrationCard
      config={provider.config}
      headline={providerHeadline(provider, status)}
      organizationId={organizationId}
      permissions={permissions}
      status={status}
    />
  )
}

function providerHeadline(
  provider: ProviderDefinition,
  status: ProviderStatus | undefined
) {
  if (provider.type === "account") {
    return getAccountHeadline(status, provider.config.label)
  }

  return getWorkspaceHeadline(
    status,
    provider.config.label,
    provider.emptyHeadline ?? `No ${provider.config.label} connected`,
    status?.name,
    provider.useUrlHeadline ? status?.url : undefined
  )
}
