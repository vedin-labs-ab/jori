import { useMutation, useQuery } from "convex/react"
import { GitPullRequestArrow } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { IntegrationActionLabel, IntegrationConnectionCard } from "./card"
import { useIntegrationInstall } from "./install"

export function LinearConnection({ tenantId }: { tenantId: string }) {
  const createInstallState = useMutation(
    api.providers.linear.install.createInstallState
  )
  const status = useQuery(api.context.integrations.getLinearStatus, {
    tenantId,
  })
  const install = useIntegrationInstall({
    connectError: "Could not start Linear install.",
    createInstallState,
    installPath: "/linear/install",
    tenantId,
  })

  return (
    <IntegrationConnectionCard
      title="Linear"
      description="Connect the Linear workspace Milo should watch."
      status={status?.status}
      headline={getLinearHeadline(status)}
      detail={getLinearDetail(status?.status)}
      icon={<GitPullRequestArrow className="size-4" />}
      error={install.error}
      actionLabel={
        <IntegrationActionLabel
          action="Connect Linear"
          isConnecting={install.isConnecting}
          loading="Connecting Linear"
        />
      }
      isConnecting={install.isConnecting}
      onConnect={install.connect}
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
