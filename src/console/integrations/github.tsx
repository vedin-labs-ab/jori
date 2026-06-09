import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { type ToolPermissionController } from "../permissions/controller"
import { IntegrationConnection } from "./card"

const githubLogo = {
  alt: "GitHub logo",
  src: "https://svgl.app/library/github_light.svg",
}

export function GitHubConnection({
  permissions,
  tenantId,
}: {
  permissions: ToolPermissionController
  tenantId: string
}) {
  const createInstallState = useMutation(
    api.providers.github.install.createInstallState
  )
  const status = useQuery(api.context.integrations.getGitHubStatus, {
    tenantId,
  })

  return (
    <IntegrationConnection
      action="Connect GitHub"
      connectError="Could not start GitHub install."
      createInstallState={createInstallState}
      detail={getGitHubDetail(status?.status)}
      headline={getGitHubHeadline(status)}
      installPath="/github/install"
      loading="Connecting GitHub"
      logo={githubLogo}
      permissions={permissions}
      provider="github"
      status={status?.status}
      tenantId={tenantId}
      title="GitHub"
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
