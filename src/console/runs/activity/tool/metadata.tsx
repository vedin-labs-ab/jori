import { forwardRef, type RefObject, useEffect, useRef, useState } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { type ActivityItem } from "../types"
import { activityToolKindForTitle } from "./summary"

type ToolMetadataItems = NonNullable<ActivityItem["metadata"]>
type ToolMetadataItem = ToolMetadataItems[number]

const metadataLabels = {
  filter: "Filter",
  outcome: "Result",
  scope: "Scope",
  target: "Target",
} satisfies Record<ToolMetadataItem["kind"], string>

export function ActivityToolMetadata({
  item,
  items,
}: {
  item: ActivityItem
  items: ToolMetadataItems
}) {
  const { title, tool } = item
  const contentRef = useRef<HTMLSpanElement>(null)
  const metadata = displayMetadata(title, items)
  const isOverflowing = useOverflowingContent(
    contentRef,
    metadata.inlineItems.map(metadataKey).join("|")
  )
  const content = (
    <ToolMetadataContent
      items={metadata.inlineItems}
      ref={contentRef}
      tool={tool}
    />
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
              <dd
                className={cn(
                  "break-words text-background",
                  isCodeMetadata(tool, item) ? "font-mono" : null
                )}
              >
                {item.text}
              </dd>
            </div>
          ))}
        </dl>
      </TooltipContent>
    </Tooltip>
  )
}

const ToolMetadataContent = forwardRef<
  HTMLSpanElement,
  { items: ToolMetadataItems; tool?: string }
>(function ToolMetadataContent({ items, tool }, ref) {
  return (
    <span
      className="inline-flex min-w-0 max-w-full items-center overflow-hidden whitespace-nowrap"
      ref={ref}
    >
      {items.map((item, index) => (
        <span
          className={cn(
            "inline-flex min-w-0 items-center",
            isCompactQualifier(item) ? "shrink-0" : null
          )}
          key={metadataKey(item)}
        >
          {index === 0 ? null : (
            <span className="mx-1.5 shrink-0 text-muted-foreground/70">·</span>
          )}
          <MetadataValue item={item} tool={tool} />
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

function isCompactQualifier(item: ToolMetadataItem) {
  return item.kind !== "target" && item.text.length <= 24
}

function MetadataValue({
  item,
  tool,
}: {
  item: ToolMetadataItem
  tool?: string
}) {
  const isCode = isCodeMetadata(tool, item)
  const Element = isCode ? "code" : "span"

  return (
    <Element
      className={cn(
        "truncate",
        isCode
          ? "min-w-0 rounded-sm bg-muted px-1 py-0.5 font-mono text-foreground"
          : isCompactQualifier(item)
            ? "shrink-0"
            : "min-w-0"
      )}
      data-metadata-value=""
    >
      {item.text}
    </Element>
  )
}

function isCodeMetadata(tool: string | undefined, item: ToolMetadataItem) {
  return (
    (tool === "bash" && item.kind === "target") ||
    (tool === "write_store" && item.kind === "scope")
  )
}

function isCountOutcome(text: string, noun: string) {
  return new RegExp(`^\\d[\\d,.]*\\s+${noun}s?$`, "i").test(text)
}

// Measuring overflow forces a synchronous layout, so it happens only when
// something can have changed the answer: the text on the line, or the width
// it has to fit in. A run's clock re-renders every row every second, and
// measuring on those renders re-read layout once per line per tick.
function useOverflowingContent(
  ref: RefObject<HTMLElement | null>,
  contentKey: string
) {
  const [measured, setMeasured] = useState({ contentKey, isOverflowing: false })

  useEffect(() => {
    const element = ref.current

    if (element === null) {
      setMeasured({ contentKey, isOverflowing: false })
      return
    }

    const measure = () =>
      setMeasured({ contentKey, isOverflowing: hasOverflowingContent(element) })

    measure()

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure)

      return () => window.removeEventListener("resize", measure)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(element)

    return () => observer.disconnect()
  }, [contentKey, ref])

  // Text that has not been measured yet is not yet known to overflow, so it
  // carries no tooltip until the pass above answers for it.
  return measured.contentKey === contentKey && measured.isOverflowing
}

function hasOverflowingContent(element: HTMLElement) {
  if (element.scrollWidth > element.clientWidth + 1) {
    return true
  }

  return [
    ...element.querySelectorAll<HTMLElement>("[data-metadata-value]"),
  ].some((value) => value.scrollWidth > value.clientWidth + 1)
}

function metadataKey(item: ToolMetadataItem) {
  return `${item.kind}:${item.text}`
}
