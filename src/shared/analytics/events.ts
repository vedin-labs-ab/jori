/** What one property of an event may hold: one of a fixed list of
 *  categories, a boolean, a number, or an opaque identifier. No kind holds
 *  free text, so nothing a person wrote can ride along on an event. */
export type Kind = readonly string[] | "boolean" | "number" | "id"

export const pages = [
  "home",
  "pricing",
  "privacy",
  "terms",
  "trust",
  "sign-in",
  "sign-out",
  "console",
  "chat",
  "context",
  "files",
  "folders",
  "integrations",
  "jobs",
  "runs",
  "settings",
  "skills",
  "stores",
  "tables",
  "usage",
  "waitlist",
] as const

/** Every event Jori may send, with the only properties each may carry.
 *  The privacy policy and the consent panel promise pages opened and
 *  features used, without names or content. An event that fits that needs
 *  only an entry here; one that does not needs those texts changed first. */
export const events = {
  $pageview: { page: pages },
} as const satisfies Record<string, Record<string, Kind>>

export type AnalyticsEvent = keyof typeof events

type Value<K extends Kind> = K extends readonly string[]
  ? K[number]
  : K extends "boolean"
    ? boolean
    : K extends "number"
      ? number
      : string

export type EventProperties<E extends AnalyticsEvent> = {
  -readonly [P in keyof (typeof events)[E]]: (typeof events)[E][P] extends Kind
    ? Value<(typeof events)[E][P]>
    : never
}

/** Identifiers Jori generates contain no spaces or punctuation, which is
 *  what keeps a sentence from passing as one. */
const identifier = /^[A-Za-z0-9_-]{1,64}$/

function holds(kind: Kind, value: unknown) {
  if (kind === "boolean") {
    return typeof value === "boolean"
  }
  if (kind === "number") {
    return typeof value === "number" && Number.isFinite(value)
  }
  if (kind === "id") {
    return typeof value === "string" && identifier.test(value)
  }
  return typeof value === "string" && kind.includes(value)
}

/** The contract's properties for a known event, or nothing when the event
 *  is unknown or any of its properties is missing or of another kind.
 *  Properties outside the contract are left behind. */
export function contractProperties(
  event: string,
  properties: unknown,
  contracts: Record<string, Record<string, Kind>> = events
) {
  const contract = Object.hasOwn(contracts, event)
    ? contracts[event]
    : undefined
  if (contract === undefined) {
    return undefined
  }
  const given = (properties ?? {}) as Record<string, unknown>
  const kept: Record<string, string | number | boolean> = {}
  for (const [name, kind] of Object.entries(contract)) {
    const value = given[name]
    if (!holds(kind, value)) {
      return undefined
    }
    kept[name] = value as string | number | boolean
  }
  return kept
}
