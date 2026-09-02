import { Check, Copy } from "lucide-react"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const copyResetDelayMs = 1200

// The bare copyable code surface: mono block with a copy button that hugs a
// single line and pins top-right on taller content. `value` is what the
// button copies; pass children to render richer content than the raw text.
export function CopyableCodeBlock({
  children,
  contentClassName,
  label,
  value,
}: {
  children?: ReactNode
  contentClassName?: string
  label: string
  value: string
}) {
  const codeRef = useRef<HTMLElement>(null)
  const isSingleRenderedLine = useIsSingleRenderedLine(codeRef)

  return (
    <div className="relative min-w-0 rounded-md bg-muted px-2.5 py-2 pr-8.5 font-mono text-foreground text-xs leading-relaxed">
      <code
        className={cn(
          "block whitespace-pre-wrap break-words",
          contentClassName
        )}
        ref={codeRef}
      >
        {children ?? value}
      </code>
      <span
        className={cn(
          "absolute right-1.5",
          isSingleRenderedLine ? "top-1/2 -translate-y-1/2" : "top-1.5"
        )}
      >
        <CopyButton label={label} value={value} />
      </span>
    </div>
  )
}

export function CopyButton({
  className,
  label,
  value,
}: {
  className?: string
  label: string
  /** The text to copy, or a getter for content fetched on click. */
  value: string | (() => Promise<string>)
}) {
  const [hasCopied, setHasCopied] = useState(false)

  useEffect(() => {
    if (!hasCopied) {
      return
    }

    const timeout = window.setTimeout(
      () => setHasCopied(false),
      copyResetDelayMs
    )

    return () => window.clearTimeout(timeout)
  }, [hasCopied])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-disabled={hasCopied}
          aria-label={`${hasCopied ? "Copied" : "Copy"} ${label}`}
          className={cn(
            "relative text-muted-foreground hover:text-foreground aria-disabled:pointer-events-none",
            className
          )}
          onClick={(event) => {
            event.stopPropagation()
            if (hasCopied) {
              return
            }

            const text =
              typeof value === "string" ? Promise.resolve(value) : value()

            void text
              .then((resolved) => navigator.clipboard.writeText(resolved))
              .then(() => setHasCopied(true))
              .catch(() => undefined)
          }}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <Copy
            className={cn(
              "transition-all duration-200 ease-out",
              hasCopied && "scale-75 opacity-0"
            )}
          />
          <Check
            className={cn(
              "absolute transition-all duration-200 ease-out",
              hasCopied ? "scale-100 opacity-100" : "scale-75 opacity-0"
            )}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{hasCopied ? "Copied" : `Copy ${label}`}</TooltipContent>
    </Tooltip>
  )
}

function useIsSingleRenderedLine(ref: React.RefObject<HTMLElement | null>) {
  const [isSingleLine, setIsSingleLine] = useState(true)

  useEffect(() => {
    const element = ref.current

    if (element === null) {
      return
    }

    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight)
      setIsSingleLine(element.offsetHeight <= lineHeight * 1.5)
    }

    measure()

    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(element)

    return () => resizeObserver.disconnect()
  }, [ref])

  return isSingleLine
}
