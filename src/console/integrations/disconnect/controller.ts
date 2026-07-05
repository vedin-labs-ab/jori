import { useAction } from "convex/react"
import { useState } from "react"
import { api } from "../../../../convex/_generated/api"
import { type ToolSurface } from "../../permissions/types"
import { showErrorToast } from "../../shared/error"

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

  async function disconnect() {
    setIsDisconnecting(true)

    try {
      await disconnectIntegration({ integration, tenantId })
    } catch (disconnectError) {
      showErrorToast(disconnectError, `Couldn't disconnect ${title}.`)
    } finally {
      setIsDisconnecting(false)
    }
  }

  return { disconnect, isDisconnecting }
}
