import * as React from "react"

import { cn } from "@/lib/utils"

const fadeRampPx = 56
const fadeOverlapPx = 13

type ExpandableTextProps = {
  children: React.ReactNode
  className?: string
  defaultExpanded?: boolean
  lessLabel?: string
  maxLines?: number
  moreLabel?: string
}

/**
 * Clamps its children to `maxLines` and becomes clickable to expand only
 * when the text actually overflows. While collapsed the last line fades
 * into an always-visible muted "… show more" cue that warms to the primary
 * color when the paragraph is hovered; expanded text collapses through a
 * "Show less" control below the paragraph.
 */
function ExpandableText({
  children,
  className,
  defaultExpanded = false,
  lessLabel = "Show less",
  maxLines = 3,
  moreLabel = "show more",
}: ExpandableTextProps) {
  const contentId = React.useId()
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  const { contentRef, controlRef, controlWidth, truncated } =
    useClampOverflow(expanded)
  const interactive = !expanded && truncated

  const expandFromText = () => {
    if (window.getSelection()?.isCollapsed === false) {
      return
    }
    setExpanded(true)
  }

  return (
    <div
      className={cn(
        "group/expandable relative",
        interactive && "cursor-pointer",
        className
      )}
      data-slot="expandable-text"
      onClick={interactive ? expandFromText : undefined}
    >
      <div
        className={cn(
          interactive && "transition-opacity group-hover/expandable:opacity-80"
        )}
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
            "cursor-pointer rounded-sm p-2 outline-none transition select-none",
            "focus-visible:ring-2 focus-visible:ring-ring/30",
            expanded
              ? "-mx-2 -mb-2 -mt-1 text-primary underline-offset-4 hover:underline"
              : cn(
                  "absolute right-0 bottom-0 -m-2 text-muted-foreground",
                  "group-hover/expandable:text-primary",
                  "focus-visible:text-primary"
                )
          )}
          data-slot="expandable-text-trigger"
          onClick={() => setExpanded((value) => !value)}
          ref={controlRef}
          type="button"
        >
          {expanded ? (
            lessLabel
          ) : (
            <>
              <span aria-hidden>… </span>
              {moreLabel}
            </>
          )}
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
  // that runs into the control's padding so the text ends close to the "…"
  // cue instead of leaving a hard gap.
  const fadeStart = Math.max(fadeCutoff - fadeOverlapPx, 0)
  const fadeEnd = fadeStart + fadeRampPx

  return {
    ...clamp,
    maskImage: [
      "linear-gradient(#000, #000)",
      `linear-gradient(to left, transparent ${fadeStart}px, #000 ${fadeEnd}px)`,
    ].join(", "),
    maskPosition: "top, bottom",
    maskRepeat: "no-repeat",
    maskSize: "100% calc(100% - 1lh), 100% 1lh",
  }
}

export { ExpandableText }
