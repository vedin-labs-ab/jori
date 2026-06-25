import { type ToolSurface } from "../contracts/integrations"

export function isVisibleCommunicationTool(
  toolName: string,
  result: unknown,
  activeSurface: ToolSurface
) {
  if (toolName === "linear_add_reaction" || toolName === "slack_add_reaction") {
    return true
  }

  return (
    toolName === "offer_integration" &&
    deliveredOnActiveSurface(result, activeSurface)
  )
}

function deliveredOnActiveSurface(result: unknown, activeSurface: ToolSurface) {
  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    return false
  }

  const delivery = (result as { delivery?: unknown }).delivery

  if (
    typeof delivery !== "object" ||
    delivery === null ||
    Array.isArray(delivery)
  ) {
    return false
  }

  return (
    (delivery as { status?: unknown }).status === "delivered" &&
    (delivery as { surface?: unknown }).surface === activeSurface
  )
}
