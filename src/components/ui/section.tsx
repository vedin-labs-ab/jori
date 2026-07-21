import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

type SectionHeaderProps = Omit<ComponentProps<"div">, "title"> & {
  action?: ReactNode
  description?: ReactNode
  title: ReactNode
}

/** A compact product-section heading with optional supporting copy and action. */
function SectionHeader({
  action,
  className,
  description,
  title,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-start justify-between gap-3",
        className
      )}
      data-slot="section-header"
      {...props}
    >
      <div className="min-w-0">
        <h3
          className="truncate font-heading text-sm font-medium tracking-tight"
          data-slot="section-title"
        >
          {title}
        </h3>
        {description ? (
          <p
            className="mt-0.5 max-w-3xl text-xs/relaxed text-muted-foreground"
            data-slot="section-description"
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="shrink-0" data-slot="section-action">
          {action}
        </div>
      ) : null}
    </div>
  )
}

export { SectionHeader }
export type { SectionHeaderProps }
