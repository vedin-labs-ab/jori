import { defaultSelection } from "../../contracts/models/selection"
import { type TestDatabase } from "./database"

// One metered day, seeded the way the rollup writes it. Every field a usage
// test never speaks about — the surface, the trigger, the key — takes a
// stand-in here, so a test reads as the row it actually cares about.

// dataModel only ships types, so it is referenced through import types: a
// value-position import statement would survive transpilation and fail to
// resolve at test runtime.
type Id<TableName extends "jobs" | "folders"> =
  import("../../convex/_generated/dataModel").Id<TableName>

export type UsageRow = {
  date: string
  organizationId?: string
  micros?: number
  ended?: number
  failed?: number
  folderId?: Id<"folders">
  job?: { id: Id<"jobs">; label: string }
}

export async function seedUsage(database: TestDatabase, row: UsageRow) {
  const {
    date,
    organizationId = "org",
    micros = 0,
    ended = 0,
    failed = 0,
    job,
    folderId,
  } = row

  await database.insert("usage", {
    organizationId,
    date,
    key: [folderId ?? "-", job?.id ?? "-", date].join(":"),
    ...(folderId === undefined ? {} : { folderId }),
    ...(job === undefined ? {} : { job }),
    surface: "jori",
    trigger: "schedule",
    model: defaultSelection.model,
    runs: { ended, failed },
    micros,
    tokens: { input: micros, output: 1 },
    updatedAt: 0,
  })
}
