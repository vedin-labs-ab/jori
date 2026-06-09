import { useState } from "react"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

type CreateInstallState = (args: {
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
  const [error, setError] = useState<string>()

  async function connect() {
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
      const installUrl = new URL(installPath, convexSiteUrl)
      installUrl.searchParams.set("state", state)
      window.location.assign(installUrl.toString())
    } catch (installError) {
      setIsConnecting(false)
      setError(readErrorMessage(installError, connectError))
    }
  }

  return { connect, error, isConnecting }
}

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
