import { AlertTriangle, Check, Copy } from "lucide-react"
import {
  type ElementType,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { absoluteTime } from "./format"

const copyResetDelayMs = 1200
const codeBlockBodyClassName =
  "max-h-80 overflow-y-auto px-2.5 py-2 font-mono text-foreground text-xs leading-relaxed"

export const codeBlockFrameClassName = "h-80"
export type DetailIcon = ElementType<{ className?: string }>

export function ErrorDetail({ value }: { value: string }) {
  return (
    <CodeBlockDetail
      icon={AlertTriangle}
      iconClassName="text-destructive"
      label="Error"
      value={value}
    />
  )
}

export function CodeBlockDetail({
  contentClassName,
  framed = false,
  header,
  icon: Icon,
  iconClassName = "text-muted-foreground",
  label,
  value,
}: {
  contentClassName?: string
  framed?: boolean
  header?: ReactNode
  icon: DetailIcon
  iconClassName?: string
  label: string
  value: string
}) {
  const codeRef = useRef<HTMLElement>(null)
  const isSingleRenderedLine = useIsSingleRenderedLine(codeRef)

  if (framed || header !== undefined) {
    return (
      <DetailRow icon={Icon} iconClassName={iconClassName} label={label}>
        <DetailFrame
          action={<CopyButton label={label} value={value} />}
          header={header}
        >
          <CodeBlockBody className={contentClassName} value={value} />
        </DetailFrame>
      </DetailRow>
    )
  }

  return (
    <DetailRow icon={Icon} iconClassName={iconClassName} label={label}>
      <div className="relative min-w-0 rounded-md bg-muted px-2.5 py-2 pr-8.5 font-mono text-foreground text-xs leading-relaxed">
        <code
          className={cn(
            "block whitespace-pre-wrap break-words",
            contentClassName
          )}
          ref={codeRef}
        >
          {value}
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
    </DetailRow>
  )
}

export function CodeBlockBody({
  className,
  value,
}: {
  className?: string
  value: string
}) {
  return (
    <div className={codeBlockBodyClassName}>
      <code className={cn("block whitespace-pre-wrap break-words", className)}>
        {value}
      </code>
    </div>
  )
}

export function DetailFrame({
  action,
  children,
  className,
  contentClassName,
  header,
}: {
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  header?: ReactNode
}) {
  const hasHeader = header !== undefined || action !== undefined

  return (
    <div
      className={cn(
        "grid min-w-0 max-w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-md bg-muted",
        className
      )}
    >
      {hasHeader ? (
        <div className="flex min-w-0 items-center justify-between gap-2 border-b px-2.5 py-1.5 text-muted-foreground">
          <div className="min-w-0 truncate">{header}</div>
          {action === undefined ? null : (
            <div className="shrink-0">{action}</div>
          )}
        </div>
      ) : null}
      <div className={cn("min-h-0 min-w-0 overflow-hidden", contentClassName)}>
        {children}
      </div>
    </div>
  )
}

export function StatusDetail({
  icon: Icon,
  iconClassName = "text-muted-foreground",
  label,
  value,
}: {
  icon: DetailIcon
  iconClassName?: string
  label: string
  value: string
}) {
  return (
    <DetailRow icon={Icon} iconClassName={iconClassName} label={label}>
      <div className="min-w-0 rounded-md bg-muted px-2.5 py-2 text-muted-foreground text-xs">
        {value}
      </div>
    </DetailRow>
  )
}

export function DetailRow({
  children,
  icon: Icon,
  iconClassName,
  label,
}: {
  children: React.ReactNode
  icon: DetailIcon
  iconClassName: string
  label: string
}) {
  return (
    <div className="grid gap-2 px-3 py-3 text-xs sm:grid-cols-[10rem_1fr]">
      <div className="flex items-start gap-2 font-medium">
        <Icon className={cn("mt-0.5 size-3.5", iconClassName)} />
        {label}
      </div>
      {children}
    </div>
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

export function RelativeTime({
  absolute,
  value,
}: {
  absolute: number
  value: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-muted-foreground text-xs">{value}</span>
      </TooltipTrigger>
      <TooltipContent>{absoluteTime(absolute)}</TooltipContent>
    </Tooltip>
  )
}

export function CopyButton({
  className,
  label,
  value,
}: {
  className?: string
  label: string
  value: string
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
            "relative aria-disabled:pointer-events-none",
            className
          )}
          onClick={(event) => {
            event.stopPropagation()
            if (hasCopied) {
              return
            }

            void navigator.clipboard
              ?.writeText(value)
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
