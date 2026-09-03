import { lazy, useMemo } from "react"
import { type RunRowSlots } from "@/shared/console/runs/row"
import { StopExecution } from "../row/stop"

let expandedRunModule: Promise<typeof import("../row/expanded")> | undefined

function loadExpandedRun() {
  expandedRunModule ??= import("../row/expanded")
  return expandedRunModule
}

function preloadExpandedRun() {
  void loadExpandedRun()
}

const ExpandedRun = lazy(async () => ({
  default: (await loadExpandedRun()).ExpandedRun,
}))

/** The row slots for one organization, held steady across ticks of the
 *  clock so a memoized row re-renders for its own run alone: the detail
 *  chunk, fetched once any row is about to open, and the stop control.
 *  The Activity page and a job's Runs section share them. */
export function useRunRowSlots(organizationId: string) {
  return useMemo<RunRowSlots>(
    () => ({
      expanded: (execution, now) => (
        <ExpandedRun
          execution={execution}
          now={now}
          organizationId={organizationId}
        />
      ),
      onPreload: preloadExpandedRun,
      stop: (execution) => (
        <StopExecution organizationId={organizationId} runId={execution.id} />
      ),
    }),
    [organizationId]
  )
}
