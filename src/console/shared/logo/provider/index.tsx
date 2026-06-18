import { MiloLogo } from "@/shared/brand"
import { providerLogoPath } from "../path"

export function ProviderLogo({
  className = "size-3",
  surface,
}: {
  className?: string
  surface: string | undefined
}) {
  if (surface === "milo") {
    return (
      <MiloLogo
        aria-hidden="true"
        className={className}
        focusable="false"
        title=""
      />
    )
  }

  const logo = providerLogoPath(surface)

  if (logo === undefined) {
    return null
  }

  return <img alt="" className={`${className} shrink-0`} src={logo} />
}
