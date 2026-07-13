import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { type ToolPermissionController } from "../../permissions/controller"
import { IntegrationCard, type IntegrationCardConfig } from "../card"
import { getWorkspaceHeadline } from "../card/headline"

const linearConfig = {
  action: "Connect Linear",
  connectedDetail:
    "Milo responds to mentions, reads issue context, and comments on issues.",
  connectError: "Couldn't start the Linear integration.",
  emptyDetail:
    "Connect Linear so Milo can respond to mentions and comment on issues.",
  installPath: "/linear/install",
  label: "Linear",
  loading: "Connecting Linear",
  logo: {
    alt: "Linear logo",
    src: "https://svgl.app/library/linear.svg",
  },
  integration: "linear",
} satisfies IntegrationCardConfig

export function LinearIntegration({
  permissions,
  tenantId,
}: {
  permissions: ToolPermissionController
  tenantId: string
}) {
  const createInstallState = useMutation(
    api.providers.linear.install.createInstallState
  )
  const status = useQuery(api.integrations.status.getLinearStatus, {
    tenantId,
  })

  return (
    <IntegrationCard
      config={linearConfig}
      createInstallState={createInstallState}
      headline={getWorkspaceHeadline(
        status,
        linearConfig.label,
        "No workspace connected",
        status?.name,
        status?.url
      )}
      permissions={permissions}
      status={status}
      tenantId={tenantId}
    />
  )
}
