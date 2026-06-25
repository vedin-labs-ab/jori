import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { type ToolPermissionController } from "../../permissions/controller"
import { IntegrationCard, type IntegrationCardConfig } from "../card/card"
import { getWorkspaceHeadline } from "../card/headline"

const githubConfig = {
  action: "Connect GitHub",
  connectedDetail:
    "Milo responds to mentions, reads the connected repositories, and replies in issue and pull request threads.",
  connectError: "Could not start the GitHub integration.",
  emptyDetail:
    "Install the GitHub App so Milo can respond to mentions in issues and pull requests.",
  installPath: "/github/install",
  label: "GitHub",
  loading: "Connecting GitHub",
  logo: {
    alt: "GitHub logo",
    src: "https://svgl.app/library/github_light.svg",
  },
  integration: "github",
} satisfies IntegrationCardConfig

export function GitHubIntegration({
  permissions,
  tenantId,
}: {
  permissions: ToolPermissionController
  tenantId: string
}) {
  const createInstallState = useMutation(
    api.providers.github.install.createInstallState
  )
  const status = useQuery(api.integrations.status.getGitHubStatus, {
    tenantId,
  })

  return (
    <IntegrationCard
      config={githubConfig}
      createInstallState={createInstallState}
      headline={getWorkspaceHeadline(
        status,
        githubConfig.label,
        "No installation connected",
        status?.name
      )}
      permissions={permissions}
      status={status}
      tenantId={tenantId}
    />
  )
}
