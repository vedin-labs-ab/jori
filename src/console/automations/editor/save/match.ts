import { type Automation } from "../../types"

export function eventMatchFormValues(
  trigger: Extract<Automation["trigger"], { event: string }>
) {
  return Object.fromEntries(
    Object.entries(trigger.match ?? {}).map(([key, value]) => [
      key,
      String(value),
    ])
  )
}

export function matchKey(match: Record<string, string>) {
  return JSON.stringify(
    Object.entries(match)
      .filter(([, value]) => value.trim() !== "")
      .sort(([left], [right]) => left.localeCompare(right))
  )
}
