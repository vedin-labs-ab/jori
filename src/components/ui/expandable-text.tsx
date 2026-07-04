import * as React from "react"

import { cn } from "@/lib/utils"

const fadeWidthPx = 48

type ExpandableTextProps = {
  children: React.ReactNode
  className?: string
  defaultExpanded?: boolean
  lessLabel?: string
  maxLines?: number
  moreLabel?: string
}

/**
 * Clamps its children to `maxLines` and shows a "Show more" control only when
 * the text actually overflows. While collapsed, the control sits at the end
 * of the last visible line behind a mask fade, so it works on any background.
 */
function ExpandableText({
  children,
  className,
  defaultExpanded = false,
  lessLabel = "Show less",
  maxLines = 3,
  moreLabel = "Show more",
}: ExpandableTextProps) {
  const contentId = React.useId()
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  const { contentRef, controlRef, controlWidth, truncated } =
    useClampOverflow(expanded)

  return (
    <div className={cn("relative", className)} data-slot="expandable-text">
      <div
        data-slot="expandable-text-content"
        id={contentId}
        ref={contentRef}
        style={
          expanded
            ? undefined
            : collapsedStyle(maxLines, truncated ? controlWidth : 0)
        }
      >
        {children}
      </div>
      {expanded || truncated ? (
        <button
          aria-controls={contentId}
          aria-expanded={expanded}
          className={cn(
            "cursor-pointer rounded-sm p-2 font-medium text-muted-foreground",
            "underline-offset-2 outline-none transition-colors select-none",
            "hover:text-foreground hover:underline",
            "focus-visible:text-foreground focus-visible:underline",
            "focus-visible:ring-2 focus-visible:ring-ring/30",
            expanded ? "-mx-2 -mb-2 -mt-1" : "absolute right-0 bottom-0 -m-2"
          )}
          data-slot="expandable-text-trigger"
          onClick={() => setExpanded((value) => !value)}
          ref={controlRef}
          type="button"
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      ) : null}
    </div>
  )
}

function useClampOverflow(expanded: boolean) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const controlRef = React.useRef<HTMLButtonElement>(null)
  const [truncated, setTruncated] = React.useState(false)
  const [controlWidth, setControlWidth] = React.useState(0)

  const measure = React.useCallback(() => {
    const content = contentRef.current
    if (content !== null && !expanded) {
      setTruncated(content.scrollHeight - content.clientHeight > 1)
    }
    const control = controlRef.current
    if (control !== null) {
      setControlWidth(control.offsetWidth)
    }
  }, [expanded])

  // Content edits rarely resize the clamped box, so a ResizeObserver alone
  // would miss them; re-measure on every commit as well.
  React.useLayoutEffect(measure)

  React.useLayoutEffect(() => {
    const content = contentRef.current
    if (content === null || typeof ResizeObserver === "undefined") {
      return
    }
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    void document.fonts?.ready.then(measure)
    return () => observer.disconnect()
  }, [measure])

  return { contentRef, controlRef, controlWidth, truncated }
}

function collapsedStyle(
  maxLines: number,
  fadeCutoff: number
): React.CSSProperties {
  const clamp: React.CSSProperties = {
    display: "-webkit-box",
    overflow: "hidden",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: maxLines,
  }

  if (fadeCutoff === 0) {
    return clamp
  }

  // Two mask layers: full opacity above the last visible line, then a fade
  // into the control across the end of that line.
  const fadeEnd = fadeCutoff + fadeWidthPx

  return {
    ...clamp,
    maskImage: [
      "linear-gradient(#000, #000)",
      `linear-gradient(to left, transparent ${fadeCutoff}px, #000 ${fadeEnd}px)`,
    ].join(", "),
    maskPosition: "top, bottom",
    maskRepeat: "no-repeat",
    maskSize: "100% calc(100% - 1lh), 100% 1lh",
  }
}

export { ExpandableText }
