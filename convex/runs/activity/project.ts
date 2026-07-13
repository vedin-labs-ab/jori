import { projectRelationActivity } from "./relations"
import { projectTraceActivity } from "./traces"
import { type ActivityData } from "./types"

export function projectActivity(data: ActivityData) {
  const items = [
    ...projectTraceActivity(data.traces, data.run, data.agents),
    ...projectRelationActivity(data),
  ]

  return items
    .sort((left, right) => left.startedAt - right.startedAt)
    .slice(-250)
}
