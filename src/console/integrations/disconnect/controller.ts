import { useAction } from "convex/react"
import { useState } from "react"
import { api } from "../../../../convex/_generated/api"
import { type ToolSurface } from "../../permissions/types"
import { showErrorToast } from "../../shared/error"

export function useIntegrationDisconnect({
  integration,
  organizationId,
  title,
}: {
  integration: Exclude<ToolSurface, "jori">
  organizationId: string
  title: string
}) {
  const disconnectIntegration = useAction(
    api.integrations.disconnect.disconnect
  )
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  async function disconnect() {
    setIsDisconnecting(true)

    try {
      await disconnectIntegration({ integration, organizationId })
    } catch (disconnectError) {
      showErrorToast(disconnectError, `Couldn't disconnect ${title}.`)
    } finally {
      setIsDisconnecting(false)
    }
  }

  return { disconnect, isDisconnecting }
}
