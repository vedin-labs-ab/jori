import { cn } from "@/lib/utils"
import {
  getScheduleSurfaceLogo,
  type ScheduleSurfaceProvider,
} from "./surfaces"

export function SurfaceLogo({
  className,
  provider,
}: {
  className?: string
  provider: ScheduleSurfaceProvider
}) {
  return (
    <img
      alt=""
      className={cn("size-3.5 shrink-0", className)}
      src={getScheduleSurfaceLogo(provider)}
    />
  )
}
