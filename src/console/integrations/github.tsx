import { useMutation, useQuery } from "convex/react"
import { GitBranch } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { IntegrationActionLabel, IntegrationConnectionCard } from "./card"
import { useIntegrationInstall } from "./install"

export function GitHubConnection({ tenantId }: { tenantId: string }) {
  const createInstallState = useMutation(
    api.providers.github.install.createInstallState
  )
  const status = useQuery(api.context.integrations.getGitHubStatus, {
    tenantId,
  })
  const install = useIntegrationInstall({
    connectError: "Could not start GitHub install.",
    createInstallState,
    installPath: "/github/install",
    tenantId,
  })

  return (
    <IntegrationConnectionCard
      title="GitHub"
      description="Connect the GitHub App installation Milo should watch."
      status={status?.status}
      headline={getGitHubHeadline(status)}
      detail={getGitHubDetail(status?.status)}
      icon={<GitBranch className="size-4" />}
      error={install.error}
      actionLabel={
        <IntegrationActionLabel
          action="Connect GitHub"
          isConnecting={install.isConnecting}
          loading="Connecting GitHub"
        />
      }
      isConnecting={install.isConnecting}
      onConnect={install.connect}
    />
  )
}

function getGitHubHeadline(
  status:
    | {
        accountId: string
        accountLogin?: string
        accountType?: string
      }
    | null
    | undefined
) {
  if (status === undefined) {
    return "Checking GitHub"
  }

  if (status?.accountLogin !== undefined) {
    return status.accountType === undefined
      ? status.accountLogin
      : `${status.accountLogin} (${status.accountType})`
  }

  return status?.accountId ?? "No installation connected"
}

function getGitHubDetail(status: "active" | "paused" | "revoked" | undefined) {
  if (status === "active") {
    return "Milo can receive signed GitHub comment webhooks, read the target repository, and reply in comment threads."
  }

  return "Install the GitHub App to enable mention-based issue and pull request comment triggers."
}
