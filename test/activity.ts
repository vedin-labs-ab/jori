import { type ActivityItem } from "../src/shared/console/runs/activity/types"

/** A completed read-file tool activity, the shape run timelines render most. */
export function activityItem(
  overrides: Partial<ActivityItem> = {}
): ActivityItem {
  return {
    access: "read",
    description: "src/app.tsx",
    details: [{ label: "Path", value: "src/app.tsx" }],
    durationMs: 1200,
    endedAt: 1700000001200,
    id: "activity",
    kind: "tool",
    startedAt: 1700000000000,
    status: "completed",
    title: "Read file",
    ...overrides,
  }
}
