import { useState } from "react"
import { toast } from "sonner"
import { showErrorToast } from "../../shared/error"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL
const integrationReturnPath = "/integrations"

export type CreateInstallState = (args: {
  tenantId: string
  returnUrl: string
}) => Promise<string>

export function useIntegrationInstall({
  connectError,
  createInstallState,
  installPath,
  tenantId,
}: {
  connectError: string
  createInstallState: CreateInstallState
  installPath: string
  tenantId: string
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
        tenantId,
        returnUrl: `${window.location.origin}${integrationReturnPath}`,
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
