export const durationUnits = ["seconds", "minutes", "hours", "days"] as const

type DurationUnit = (typeof durationUnits)[number]

export type Duration = {
  unit: DurationUnit
  value: number
}

const millisecondsByDurationUnit = {
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
} satisfies Record<DurationUnit, number>

export function durationMilliseconds(duration: Duration) {
  return duration.value * millisecondsByDurationUnit[duration.unit]
}

export function isDurationUnit(value: unknown): value is DurationUnit {
  return durationUnits.some((unit) => unit === value)
}
