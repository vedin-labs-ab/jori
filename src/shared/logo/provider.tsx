import { isIntegration } from "@contracts/integrations"
import { JoriLogo } from "@/shared/brand"
import { IntegrationLogo } from "./integration"

/** The mark of the surface a tool or run belongs to: Jori's own, or the
 *  integration's. Decorative, since the surface's name stands beside it. */
export function ProviderLogo({
  className = "size-3",
  surface,
}: {
  className?: string
  surface: string | undefined
}) {
  if (surface === "jori") {
    return (
      <JoriLogo
        aria-hidden="true"
        className={className}
        focusable="false"
        title=""
      />
    )
  }

  if (surface === undefined || !isIntegration(surface)) {
    return null
  }

  return (
    <IntegrationLogo className={className} decorative integration={surface} />
  )
}
