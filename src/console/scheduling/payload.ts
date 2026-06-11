import { buildRecurringCron, classifyCron } from "./cron"
import { toDatetimeLocal } from "./format"
import {
  hasScheduleWriteSurface,
  normalizeScheduleSurfaceMentions,
  syncScheduleSurfaces,
} from "./surfaces"
import {
  emptyScheduleForm,
  type Schedule,
  type ScheduleFormValues,
} from "./types"

type ScheduleSpec =
  | { type: "oneShot"; runAt: string }
  | { type: "recurring"; cron: string }

type ScheduleArgs = {
  name: string
  description: string
  output: {
    readScope: ScheduleFormValues["readScope"]
    surfaces: Array<{
      provider: ScheduleFormValues["surfaces"][number]["provider"]
      access: Exclude<ScheduleFormValues["surfaces"][number]["access"], "">
    }>
  }
}

type ArgsResult<Args> = { args: Args } | { error: string }

export function scheduleFormValues(
  schedule: Schedule | undefined
): ScheduleFormValues {
  if (schedule === undefined) {
    return emptyScheduleForm
  }

  return {
    name: schedule.name,
    description: normalizeScheduleSurfaceMentions(schedule.description),
    type: schedule.type,
    ...classifyCron(schedule.cron),
    runAt: schedule.runAt === undefined ? "" : toDatetimeLocal(schedule.runAt),
    readScope: schedule.output.readScope,
    surfaces: schedule.output.surfaces,
  }
}

export function createScheduleArgs(
  values: ScheduleFormValues
): ArgsResult<ScheduleArgs & { schedule: ScheduleSpec }> {
  const base = buildBaseArgs(values)

  if ("error" in base) {
    return base
  }

  const timing = buildScheduleSpec(values)

  if ("error" in timing) {
    return timing
  }

  return { args: { ...base.args, schedule: timing.schedule } }
}

export function updateScheduleArgs(
  values: ScheduleFormValues,
  existing: Schedule
): ArgsResult<ScheduleArgs & { schedule?: ScheduleSpec }> {
  const base = buildBaseArgs(values)

  if ("error" in base) {
    return base
  }

  // An unchanged timing is left out of the update so editing the name or
  // output never re-schedules the run or revives a completed schedule.
  if (!hasTimingChanged(values, existing)) {
    return base
  }

  const timing = buildScheduleSpec(values)

  if ("error" in timing) {
    return timing
  }

  return { args: { ...base.args, schedule: timing.schedule } }
}

function buildBaseArgs(values: ScheduleFormValues): ArgsResult<ScheduleArgs> {
  const name = values.name.trim()
  const description = normalizeScheduleSurfaceMentions(
    values.description.trim()
  )
  const surfaces = syncScheduleSurfaces(
    description,
    values.surfaces,
    values.readScope
  )

  if (name === "") {
    return { error: "Name is required." }
  }

  if (description === "") {
    return { error: "Instructions are required." }
  }

  if (surfaces.length === 0) {
    return { error: "Add at least one integration badge." }
  }

  if (surfaces.some((surface) => surface.access === "")) {
    return { error: "Choose read, write, or both for each integration badge." }
  }

  if (!hasScheduleWriteSurface(surfaces)) {
    return { error: "At least one integration must allow writes." }
  }

  return {
    args: {
      name,
      description,
      output: {
        readScope: values.readScope,
        surfaces: surfaces.map((surface) => ({
          access: surface.access as Exclude<typeof surface.access, "">,
          provider: surface.provider,
        })),
      },
    },
  }
}

function buildScheduleSpec(
  values: ScheduleFormValues
): { schedule: ScheduleSpec } | { error: string } {
  if (values.type === "recurring") {
    const built = buildRecurringCron(values)

    if ("error" in built) {
      return built
    }

    return { schedule: { type: "recurring", cron: built.cron } }
  }

  if (values.runAt === "") {
    return { error: "Run time is required." }
  }

  const runAt = new Date(values.runAt)

  if (Number.isNaN(runAt.getTime())) {
    return { error: "Run time is not a valid date." }
  }

  if (runAt.getTime() <= Date.now()) {
    return { error: "Run time must be in the future." }
  }

  return { schedule: { type: "oneShot", runAt: runAt.toISOString() } }
}

function hasTimingChanged(values: ScheduleFormValues, existing: Schedule) {
  if (values.type !== existing.type) {
    return true
  }

  if (values.type === "recurring") {
    const built = buildRecurringCron(values)

    return "error" in built || built.cron !== (existing.cron ?? "")
  }

  return values.runAt !== scheduleFormValues(existing).runAt
}
