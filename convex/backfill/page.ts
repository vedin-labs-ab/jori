import { type EventData } from "../events/schema"
import { type Actor } from "../shared/actor"

// The provider-neutral currency of a backfill: normalized events ready for
// recordBackfillEvent, plus the cursor that resumes the walk. A null cursor
// means the provider is exhausted.
export type BackfillEvent = {
  key: string
  type: string
  text: string
  actor?: Actor
  data: EventData
  observedAt: number
}

export type BackfillPage<Cursor> = {
  events: BackfillEvent[]
  cursor: Cursor | null
}
