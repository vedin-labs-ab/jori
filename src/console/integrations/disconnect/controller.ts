import { useAction } from "convex/react"
import { useState } from "react"
import { api } from "../../../../convex/_generated/api"
import { type ToolSurface } from "../../permissions/types"
import { readErrorMessage } from "../../shared/error"

export function useIntegrationDisconnect({
  integration,
  tenantId,
  title,
}: {
  integration: Exclude<ToolSurface, "milo">
  tenantId: string
  title: string
}) {
  const disconnectIntegration = useAction(
    api.integrations.disconnect.disconnect
  )
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState<string>()

  async function disconnect() {
    setError(undefined)
    setIsDisconnecting(true)

    try {
      await disconnectIntegration({ integration, tenantId })
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
