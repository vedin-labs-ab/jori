import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { type ToolPermissionController } from "../permissions/controller"
import { IntegrationConnection } from "./card"

const linearLogo = {
  alt: "Linear logo",
  src: "https://svgl.app/library/linear.svg",
}

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
  const status = useQuery(api.context.integrations.getLinearStatus, {
    tenantId,
  })

  return (
    <IntegrationConnection
      action="Connect Linear"
      connectError="Could not start Linear install."
      createInstallState={createInstallState}
      detail={getLinearDetail(status?.status)}
      headline={getLinearHeadline(status)}
      installPath="/linear/install"
      loading="Connecting Linear"
      logo={linearLogo}
      permissions={permissions}
      provider="linear"
      status={status?.status}
      tenantId={tenantId}
      title="Linear"
    />
  )
}

function getLinearHeadline(
  status:
    | {
        accountId: string
        organizationName?: string
        organizationUrlKey?: string
      }
    | null
    | undefined
) {
  if (status === undefined) {
    return "Checking Linear"
  }

  return (
    status?.organizationName ??
    status?.organizationUrlKey ??
    status?.accountId ??
    "No workspace connected"
  )
}

function getLinearDetail(status: "active" | "paused" | "revoked" | undefined) {
  if (status === "active") {
    return "Milo can receive signed Linear issue and comment events, read issue context, and post issue comments."
  }

  return "Install Milo as a Linear app user to enable issue comments and mention-based triggers."
}
