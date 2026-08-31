import { type UIEvent, useEffect, useRef } from "react"
import { CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { scrollFade, scrollFadeX } from "@/shared/fade"
import { type Workstream, type Workstreams } from "../types"
import { LaneRow, stickyLane } from "./lane"
import { type Pulse, type PulseDays, type PulseLane } from "./series"

type PulseViewportProps = {
  dayCount: PulseDays
  days: Pulse["days"]
  lanes: PulseLane[]
  onOpen: (workstream: Workstream) => void
  unplaced: number
  workstreams: Workstreams
}

// Preserve the pinned lane label while fading the scrollable day cells.
// The shared fade classes own the scroll-aware edge values and animation.
const horizontalFade = cn(
  scrollFadeX,
  "[--scroll-fade-mask:linear-gradient(to_right,currentColor_0,currentColor_11.5rem,transparent_11.5rem,currentColor_calc(11.5rem+var(--scroll-fade-s,0px)),currentColor_calc(100%-var(--scroll-fade-e,0px)),transparent_100%)]"
)

const laneGrids: Record<PulseDays, string> = {
  14: "grid grid-cols-[11.5rem_repeat(14,22px)] items-center",
  30: "grid grid-cols-[11.5rem_repeat(30,22px)] items-center",
  60: "grid grid-cols-[11.5rem_repeat(60,22px)] items-center",
}

export function PulseViewport({
  dayCount,
  days,
  lanes,
  onOpen,
  unplaced,
  workstreams,
}: PulseViewportProps) {
  const laneGrid = laneGrids[dayCount]
  const workstreamLanes = lanes.filter((lane) => lane.id !== null)
  const unplacedLane = lanes.find((lane) => lane.id === null)
  const { footerRef, synchronize, workstreamsRef } =
    useSynchronizedHorizontalScroll()

  return (
    <CardContent className="px-0">
      <div className={cn(scrollFade, "max-h-56 overflow-y-auto")}>
        <div
          className={cn(horizontalFade, "no-scrollbar overflow-x-auto")}
          onScroll={synchronize}
          ref={workstreamsRef}
        >
          <div className="flex w-fit flex-col gap-1 pr-(--card-spacing)">
            {workstreamLanes.map((lane) => (
              <LaneRow
                key={lane.id}
                lane={lane}
                laneGrid={laneGrid}
                unplaced={0}
                onOpen={laneOpener(lane, workstreams, onOpen)}
              />
            ))}
          </div>
        </div>
      </div>
      <div
        className={cn(horizontalFade, "overflow-x-auto")}
        onScroll={synchronize}
        ref={footerRef}
      >
        <div className="flex w-fit flex-col gap-1 pr-(--card-spacing)">
          {unplacedLane === undefined ? null : (
            <LaneRow
              lane={unplacedLane}
              laneGrid={laneGrid}
              unplaced={unplaced}
              onOpen={undefined}
            />
          )}
          <PulseAxis days={days} laneGrid={laneGrid} />
        </div>
      </div>
    </CardContent>
  )
}

function PulseAxis({
  days,
  laneGrid,
}: {
  days: Pulse["days"]
  laneGrid: string
}) {
  return (
    <div className={laneGrid}>
      <span className={stickyLane} />
      {days.map((day) => (
        <span
          key={day.key}
          className={cn(
            "whitespace-nowrap pt-1 text-center text-[11px] text-muted-foreground tabular-nums",
            day.emphasized && "font-medium text-foreground"
          )}
        >
          {day.label}
        </span>
      ))}
    </div>
  )
}

// Today stays aligned at the right edge across both horizontal viewports.
// Scrolling either section moves the other by the same relative progress.
function useSynchronizedHorizontalScroll() {
  const workstreamsRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const pinned = useRef(true)

  useEffect(() => {
    const nodes = scrollNodes(workstreamsRef.current, footerRef.current)
    pinned.current = true
    scrollToEnd(nodes)

    const observer = new ResizeObserver(() => {
      if (pinned.current) {
        scrollToEnd(nodes)
      }
    })

    for (const node of nodes) {
      observer.observe(node)

      if (node.firstElementChild !== null) {
        observer.observe(node.firstElementChild)
      }
    }

    return () => observer.disconnect()
  }, [])

  const synchronize = (event: UIEvent<HTMLDivElement>) => {
    const source = event.currentTarget
    const sourceMaximum = maximumScroll(source)
    const progress = sourceMaximum === 0 ? 0 : source.scrollLeft / sourceMaximum
    pinned.current = sourceMaximum - source.scrollLeft <= 2

    for (const target of scrollNodes(
      workstreamsRef.current,
      footerRef.current
    )) {
      const scrollLeft = progress * maximumScroll(target)

      if (target !== source && Math.abs(target.scrollLeft - scrollLeft) > 1) {
        target.scrollLeft = scrollLeft
      }
    }
  }

  return { footerRef, synchronize, workstreamsRef }
}

function scrollNodes(
  workstreams: HTMLDivElement | null,
  footer: HTMLDivElement | null
) {
  return [workstreams, footer].filter(
    (node): node is HTMLDivElement => node !== null
  )
}

function scrollToEnd(nodes: HTMLDivElement[]) {
  for (const node of nodes) {
    node.scrollLeft = node.scrollWidth
  }
}

function maximumScroll(node: HTMLDivElement) {
  return node.scrollWidth - node.clientWidth
}

function laneOpener(
  lane: PulseLane,
  workstreams: Workstreams,
  onOpen: (workstream: Workstream) => void
) {
  const workstream = workstreams.find((row) => row.id === lane.id)

  return workstream === undefined ? undefined : () => onOpen(workstream)
}
