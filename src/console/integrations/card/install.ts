import { useState } from "react"
import { toast } from "sonner"
import { showErrorToast } from "../../shared/error"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

export type CreateInstallState = (args: {
  organizationId: string
  returnUrl: string
}) => Promise<string>

export function useIntegrationInstall({
  connectError,
  createInstallState,
  installPath,
  organizationId,
  returnPath,
}: {
  connectError: string
  createInstallState: CreateInstallState
  installPath: string
  organizationId: string
  returnPath: string
}) {
  const [isConnecting, setIsConnecting] = useState(false)

  async function connect() {
    if (!convexSiteUrl) {
      toast.error("Missing VITE_CONVEX_SITE_URL.")
      return
    }

    setIsConnecting(true)

    try {
      const state = await createInstallState({
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
