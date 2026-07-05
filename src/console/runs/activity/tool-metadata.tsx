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
import { activityToolKindForTitle } from "./tool-summary"
import { type ActivityItem } from "./types"

type ToolMetadataItems = NonNullable<ActivityItem["metadata"]>
type ToolMetadataItem = ToolMetadataItems[number]

const metadataLabels = {
  filter: "Filter",
  outcome: "Result",
  scope: "Scope",
  target: "Target",
} satisfies Record<ToolMetadataItem["kind"], string>

export function ActivityToolMetadata({
  items,
  title,
}: {
  items: ToolMetadataItems
  title: string
}) {
  const contentRef = useRef<HTMLSpanElement>(null)
  const isOverflowing = useOverflowingContent(contentRef)
  const metadata = displayMetadata(title, items)
  const content = (
    <ToolMetadataContent items={metadata.inlineItems} ref={contentRef} />
  )

  if (!isOverflowing) {
    return content
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent className="max-w-sm items-stretch px-3 py-2 text-left">
        <dl className="grid gap-1.5">
          {metadata.tooltipItems.map((item) => (
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
      className="inline-flex min-w-0 max-w-full items-center overflow-hidden whitespace-nowrap"
      ref={ref}
    >
      {items.map((item, index) => (
        <span
          className={cn(
            "inline-flex min-w-0 items-center",
            isCompactOutcome(item) ? "shrink-0" : "min-w-0 flex-1 basis-0"
          )}
          key={metadataKey(item)}
        >
          {index === 0 ? null : (
            <span className="mx-1.5 shrink-0 text-muted-foreground/70">·</span>
          )}
          <span
            className={cn(
              "truncate",
              isCompactOutcome(item) ? "shrink-0" : "min-w-0"
            )}
          >
            {item.text}
          </span>
        </span>
      ))}
    </span>
  )
})

function displayMetadata(title: string, items: ToolMetadataItems) {
  const displayItems = reactionMetadata(title, items)
  const inlineItems = inlineMetadata(title, displayItems)

  return {
    inlineItems,
    tooltipItems: displayItems,
  }
}

function reactionMetadata(title: string, items: ToolMetadataItems) {
  if (activityToolKindForTitle(title) !== "reaction") {
    return items
  }

  const targets = items.filter((item) => item.kind === "target")

  return targets.length > 0
    ? targets
    : items.filter((item) => !isReactionOutcome(item))
}

function isReactionOutcome(item: ToolMetadataItem) {
  return (
    item.kind === "outcome" &&
    item.text.trim().toLowerCase() === "reaction added"
  )
}

function inlineMetadata(title: string, items: ToolMetadataItems) {
  switch (activityToolKindForTitle(title)) {
    case "web-fetch":
      return compactMetadata(items, [
        firstMetadataItem(items, "target"),
        firstOutcome(items, "page"),
      ])
    case "web-search":
      return compactMetadata(items, [
        firstMetadataItem(items, "target"),
        firstOutcome(items, "result"),
      ])
    case "generic":
    case "read":
    case "reaction":
    case "send":
      return items
  }
}

function compactMetadata(
  fallbackItems: ToolMetadataItems,
  candidates: Array<ToolMetadataItem | undefined>
) {
  const items = candidates.filter((item) => item !== undefined)

  return items.length === 0 ? fallbackItems : dedupeMetadata(items)
}

function dedupeMetadata(items: ToolMetadataItem[]) {
  const seen = new Set<string>()
  const result: ToolMetadataItem[] = []

  for (const item of items) {
    const key = metadataKey(item)

    if (!seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }

  return result
}

function firstMetadataItem(
  items: ToolMetadataItems,
  kind: ToolMetadataItem["kind"]
) {
  return items.find((item) => item.kind === kind)
}

function firstOutcome(items: ToolMetadataItems, noun: string) {
  return items.find(
    (item) => item.kind === "outcome" && isCountOutcome(item.text, noun)
  )
}

function isCompactOutcome(item: ToolMetadataItem) {
  return item.kind === "outcome" && item.text.length <= 24
}

function isCountOutcome(text: string, noun: string) {
  return new RegExp(`^\\d[\\d,.]*\\s+${noun}s?$`, "i").test(text)
}

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
