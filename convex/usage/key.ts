import { type Infer } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { type ToolSurface } from "../shared/integrations"
import { type usageTrigger } from "./schema"

// The identity half of a usage row: which tuple a day's totals belong to,
// and which day that is. Both are pure so the write path, a rebuild, and a
// test can derive the same row without a database.

export type UsageTrigger = Infer<typeof usageTrigger>

export type UsageAttribution = {
  folderId?: Id<"folders">
  automation?: { id: Id<"automations">; label: string }
  personId?: Id<"persons">
  surface: ToolSurface
  trigger: UsageTrigger
}

/** Stands in for a dimension the work has none of — unfiled, unautomated,
 *  or nobody's in particular — so every key has the same five parts. */
const absent = "-"

/** The automation's label is deliberately not part of this: a rename must
 *  move a row's caption, never its identity. */
export function usageKey(attribution: UsageAttribution) {
  return [
    attribution.folderId ?? absent,
    attribution.automation?.id ?? absent,
    attribution.personId ?? absent,
    attribution.surface,
    attribution.trigger,
  ].join(":")
}

/** The calendar date a timestamp falls on in the given zone. `en-CA` is the
 *  locale whose numeric date format is already `YYYY-MM-DD`, so the zone
 *  does the arithmetic and no manual offset math can drift. */
export function usageDate(timestamp: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(
    new Date(timestamp)
  )
}
