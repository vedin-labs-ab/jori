import { useMutation } from "convex/react"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import { readErrorMessage } from "../error"
import { type ToolProvider } from "../permissions/controller"

export function useIntegrationDisconnect({
  provider,
  tenantId,
  title,
}: {
  provider: Exclude<ToolProvider, "milo">
  tenantId: string
  title: string
}) {
  const disconnectIntegration = useMutation(
    api.integrations.disconnect.disconnect
  )
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState<string>()

  async function disconnect() {
    setError(undefined)
    setIsDisconnecting(true)

    try {
      await disconnectIntegration({ provider, tenantId })
    } catch (disconnectError) {
      setError(
        readErrorMessage(disconnectError, `Could not disconnect ${title}.`)
      )
    } finally {
      setIsDisconnecting(false)
    }
  }

  return { disconnect, error, isDisconnecting }
}
