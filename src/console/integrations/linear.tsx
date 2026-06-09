import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { type ToolPermissionController } from "../permissions/controller"
import { getWorkspaceHeadline } from "./headline"
import {
  WorkspaceConnection,
  type WorkspaceConnectionConfig,
} from "./workspace"

const linearConfig = {
  action: "Connect Linear",
  connectedDetail:
    "Milo can receive signed Linear issue and comment events, read issue context, and post issue comments.",
  connectError: "Could not start Linear install.",
  emptyDetail:
    "Install Milo as a Linear app user to enable issue comments and mention-based triggers.",
  installPath: "/linear/install",
  label: "Linear",
  loading: "Connecting Linear",
  logo: {
    alt: "Linear logo",
    src: "https://svgl.app/library/linear.svg",
  },
  provider: "linear",
} satisfies WorkspaceConnectionConfig

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
    <WorkspaceConnection
      config={linearConfig}
      createInstallState={createInstallState}
      headline={getWorkspaceHeadline(
        status,
        linearConfig.label,
        "No workspace connected",
        status?.organizationName,
        status?.organizationUrlKey
      )}
      permissions={permissions}
      status={status}
      tenantId={tenantId}
    />
  )
}
