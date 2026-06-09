import { useMutation, useQuery } from "convex/react"
import { ExternalLink, GitBranch, Loader2 } from "lucide-react"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import { IntegrationConnectionCard } from "./card"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

export function GitHubConnection({ tenantId }: { tenantId: string }) {
  const createInstallState = useMutation(
    api.providers.github.install.createInstallState
  )
  const status = useQuery(api.context.integrations.getGitHubStatus, {
    tenantId,
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string>()

  async function connectGitHub() {
    if (!convexSiteUrl) {
      setError("Missing VITE_CONVEX_SITE_URL.")
      return
    }

    setError(undefined)
    setIsConnecting(true)

    try {
      const state = await createInstallState({
        tenantId,
        returnUrl: window.location.origin,
      })
      const installUrl = new URL("/github/install", convexSiteUrl)
      installUrl.searchParams.set("state", state)
      window.location.assign(installUrl.toString())
    } catch (installError) {
      setIsConnecting(false)
      setError(
        installError instanceof Error
          ? installError.message
          : "Could not start GitHub install."
      )
    }
  }

  return (
    <IntegrationConnectionCard
      title="GitHub"
      description="Connect the GitHub App installation Milo should watch."
      status={status?.status}
      headline={getGitHubHeadline(status)}
      detail={getGitHubDetail(status?.status)}
      icon={<GitBranch className="size-4" />}
      error={error}
      actionLabel={<GitHubActionLabel isConnecting={isConnecting} />}
      isConnecting={isConnecting}
      onConnect={connectGitHub}
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

function GitHubActionLabel({ isConnecting }: { isConnecting: boolean }) {
  if (isConnecting) {
    return (
      <>
        <Loader2 className="size-4 animate-spin" />
        Connecting GitHub
      </>
    )
  }

  return (
    <>
      Connect GitHub
      <ExternalLink />
    </>
  )
}
