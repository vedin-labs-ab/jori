import { type ReactNode, useId, useState } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type CellErrorAttributes = {
  "aria-describedby": string | undefined
  "aria-invalid": true | undefined
}

/** Cell feedback never adds a grid row or takes focus from its editor. */
export function CellError({
  children,
  className = "min-w-0",
  message,
}: {
  children: (attributes: CellErrorAttributes) => ReactNode
  className?: string
  message: string | undefined
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const invalid = message !== undefined

  return (
    <TooltipProvider>
      <Tooltip open={invalid && open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <div
            className={className}
            aria-describedby={undefined}
            onFocusCapture={() => setOpen(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setOpen(false)
              }
            }}
          >
            {children({
              "aria-describedby": invalid ? id : undefined,
              "aria-invalid": invalid ? true : undefined,
            })}
            {invalid ? (
              <span className="sr-only" id={id} role="alert">
                {message}
              </span>
            ) : null}
          </div>
        </TooltipTrigger>
        {invalid ? (
          <TooltipContent side="top" align="start" sideOffset={4}>
            {message}
          </TooltipContent>
        ) : null}
      </Tooltip>
    </TooltipProvider>
  )
}
