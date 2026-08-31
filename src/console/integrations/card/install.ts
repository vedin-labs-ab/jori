import { useMutation } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "../../../../convex/_generated/api"
import { type ToolSurface } from "../../permissions/types"
import { showErrorToast } from "../../shared/error"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

export function useIntegrationInstall({
  connectError,
  installPath,
  integration,
  organizationId,
  returnPath,
}: {
  connectError: string
  installPath: string
  integration: Exclude<ToolSurface, "jori">
  organizationId: string
  returnPath: string
}) {
  const createInstallState = useMutation(
    api.integrations.connect.install.createInstallState
  )
  const [isConnecting, setIsConnecting] = useState(false)

  async function connect() {
    if (!convexSiteUrl) {
      toast.error("Missing VITE_CONVEX_SITE_URL.")
      return
    }

    setIsConnecting(true)

    try {
      const state = await createInstallState({
        integration,
        organizationId,
        returnUrl: `${window.location.origin}${returnPath}`,
      })
      const installUrl = new URL(installPath, convexSiteUrl)
      installUrl.searchParams.set("state", state)
      window.location.assign(installUrl.toString())
    } catch (installError) {
      setIsConnecting(false)
      showErrorToast(installError, connectError)
    }
  }

  return { connect, isConnecting }
}
