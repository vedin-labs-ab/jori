import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Reserve the widest label without duplicating its accessible name. */
export function StableLabel({
  alternatives,
  children,
  className,
}: {
  alternatives: string[]
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cn("grid justify-items-start", className)}>
      {alternatives.map((label) => (
        <span
          aria-hidden
          className="invisible col-start-1 row-start-1"
          key={label}
        >
          {label}
        </span>
      ))}
      <span className="col-start-1 row-start-1">{children}</span>
    </span>
  )
}
