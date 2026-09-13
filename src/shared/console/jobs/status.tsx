import { type Job } from "./types"

/** Non-active lifecycle state, separate from an item's sharing metadata. */
export function JobStatus({ status }: { status: Job["status"] | undefined }) {
  return status === "paused" || status === "completed" ? (
    <span className="shrink-0 text-muted-foreground text-xs">
      {status === "paused" ? "Paused" : "Completed"}
    </span>
  ) : null
}
