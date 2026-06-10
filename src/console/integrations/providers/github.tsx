import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { type ToolPermissionController } from "../../permissions/controller"
import {
  IntegrationConnection,
  type IntegrationConnectionConfig,
} from "../shared/card"
import { getWorkspaceHeadline } from "../shared/headline"

const githubConfig = {
  action: "Connect GitHub",
  connectedDetail:
    "Milo can receive signed GitHub comment webhooks, read the target repository, and reply in comment threads.",
  connectError: "Could not start GitHub install.",
  emptyDetail:
    "Install the GitHub App to enable mention-based issue and pull request comment triggers.",
  installPath: "/github/install",
  label: "GitHub",
  loading: "Connecting GitHub",
  logo: {
    alt: "GitHub logo",
    src: "https://svgl.app/library/github_light.svg",
  },
  provider: "github",
} satisfies IntegrationConnectionConfig

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
  const status = useQuery(api.integrations.status.getGitHubStatus, {
    tenantId,
  })

  return (
    <IntegrationConnection
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
