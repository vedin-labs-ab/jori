import { useMutation, useQuery } from "convex/react"
import { GitPullRequestArrow } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { IntegrationConnection } from "./card"

export function LinearConnection({ tenantId }: { tenantId: string }) {
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
      description="Connect the Linear workspace Milo should watch."
      detail={getLinearDetail(status?.status)}
      headline={getLinearHeadline(status)}
      icon={<GitPullRequestArrow className="size-4" />}
      installPath="/linear/install"
      loading="Connecting Linear"
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
