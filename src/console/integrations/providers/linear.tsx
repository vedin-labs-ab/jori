import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { type ToolPermissionController } from "../../permissions/controller"
import {
  IntegrationConnection,
  type IntegrationConnectionConfig,
} from "../connection/card"
import { getWorkspaceHeadline } from "../connection/headline"

const linearConfig = {
  action: "Connect Linear",
  connectedDetail:
    "Milo responds to mentions, reads issue context, and comments on issues.",
  connectError: "Could not start the Linear connection.",
  emptyDetail:
    "Connect Linear so Milo can respond to mentions and comment on issues.",
  installPath: "/linear/install",
  label: "Linear",
  loading: "Connecting Linear",
  logo: {
    alt: "Linear logo",
    src: "https://svgl.app/library/linear.svg",
  },
  provider: "linear",
} satisfies IntegrationConnectionConfig

export function LinearConnection({
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
    <IntegrationConnection
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
