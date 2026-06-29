import {
  forwardRef,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { type ActivityItem } from "./types"

type ToolMetadataItems = NonNullable<ActivityItem["metadata"]>
type ToolMetadataItem = ToolMetadataItems[number]

const metadataLabels = {
  outcome: "Result",
  scope: "Scope",
  target: "Target",
} satisfies Record<ToolMetadataItem["kind"], string>

export function ActivityToolMetadata({ items }: { items: ToolMetadataItems }) {
  const contentRef = useRef<HTMLSpanElement>(null)
  const isOverflowing = useOverflowingContent(contentRef)
  const content = <ToolMetadataContent items={items} ref={contentRef} />

  if (!isOverflowing) {
    return content
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent className="max-w-sm items-stretch px-3 py-2 text-left">
        <dl className="grid gap-1.5">
          {items.map((item) => (
            <div
              className="grid min-w-0 grid-cols-[3.75rem_minmax(0,1fr)] gap-2"
              key={metadataKey(item)}
            >
              <dt className="text-background/70">
                {metadataLabels[item.kind]}
              </dt>
              <dd className="break-words text-background">{item.text}</dd>
            </div>
          ))}
        </dl>
      </TooltipContent>
    </Tooltip>
  )
}

const ToolMetadataContent = forwardRef<
  HTMLSpanElement,
  { items: ToolMetadataItems }
>(function ToolMetadataContent({ items }, ref) {
  return (
    <span
      className="inline-flex min-w-0 max-w-full items-center overflow-hidden"
      ref={ref}
    >
      {items.map((item, index) => (
        <span
          className={cn(
            "inline-flex min-w-0 items-center",
            item.kind === "outcome" ? "shrink-0" : "shrink"
          )}
          key={metadataKey(item)}
        >
          {index === 0 ? null : (
            <span className="mx-1.5 shrink-0 text-muted-foreground/70">·</span>
          )}
          <span
            className={cn(
              "truncate",
              item.kind === "outcome" ? "shrink-0" : "min-w-0"
            )}
          >
            {item.text}
          </span>
        </span>
      ))}
    </span>
  )
})

function useOverflowingContent(ref: RefObject<HTMLElement | null>) {
  const [isOverflowing, setIsOverflowing] = useState(false)
  const updateOverflowState = useCallback(() => {
    const element = ref.current
    setIsOverflowing(
      element === null ? false : element.scrollWidth > element.clientWidth + 1
    )
  }, [ref])

  useEffect(() => {
    updateOverflowState()
  })

  useEffect(() => {
    const element = ref.current

    if (element === null) {
      setIsOverflowing(false)
      return
    }

    updateOverflowState()

    if (typeof ResizeObserver === "undefined") {
      if (typeof window === "undefined") {
        return
      }

      window.addEventListener("resize", updateOverflowState)

      return () => window.removeEventListener("resize", updateOverflowState)
    }

    const observer = new ResizeObserver(updateOverflowState)
    observer.observe(element)

    return () => observer.disconnect()
  }, [ref, updateOverflowState])

  return isOverflowing
}

function metadataKey(item: ToolMetadataItem) {
  return `${item.kind}:${item.text}`
}
