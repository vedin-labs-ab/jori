import {
  getScheduleSurfaceLogo,
  type ScheduleSurfaceProvider,
} from "./surfaces"

export function SurfaceLogo({
  provider,
}: {
  provider: ScheduleSurfaceProvider
}) {
  return (
    <img
      alt=""
      className="size-3.5 shrink-0"
      src={getScheduleSurfaceLogo(provider)}
    />
  )
}
