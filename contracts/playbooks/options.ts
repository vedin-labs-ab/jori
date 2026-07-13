// Playbook setup is a small, declarative layer over raw automations. Sections
// describe the setup flow, fields hold typed values, and behaviors group the
// values that together express one user-visible outcome.

export type PlaybookOptionValue = boolean | number | string
export type PlaybookOptionValues = Record<string, PlaybookOptionValue>

type PlaybookOptionBase = {
  key: string
  label: string
  /** Show and apply this field only while another field holds a value.
   *  Predicates chase enablement transitively through their target. */
  enabledWhen?: { key: string; value: PlaybookOptionValue }
}

export type PlaybookBooleanOptionField = PlaybookOptionBase & {
  kind: "boolean"
  default: boolean
}

export type PlaybookOptionField =
  | PlaybookBooleanOptionField
  | (PlaybookOptionBase & {
      kind: "choice"
      choices: ReadonlyArray<{ value: string; label: string }>
      default: string
      /** Toggle group by default; "select" fits longer choice lists. */
      control?: "toggle" | "select"
    })
  | (PlaybookOptionBase & { kind: "time"; default: string })
  | (PlaybookOptionBase & {
      kind: "minutes"
      default: number
      min: number
      max: number
      /** What the dialog offers; free values within bounds stay valid. */
      presets: readonly number[]
    })

export type PlaybookBehavior = {
  key: string
  label: string
  description?: string
  enabledBy?: PlaybookBooleanOptionField
  fields: readonly PlaybookOptionField[]
}

export type PlaybookSetupSection =
  | {
      key: string
      kind: "fields"
      label: string
      fields: readonly PlaybookOptionField[]
    }
  | {
      key: string
      kind: "behaviors"
      label: string
      behaviors: readonly PlaybookBehavior[]
    }

/** Flatten setup presentation into the canonical option field collection. */
export function playbookOptionFields(
  setup: readonly PlaybookSetupSection[] = []
): PlaybookOptionField[] {
  const behaviorKeys = new Set<string>()
  const fields: PlaybookOptionField[] = []
  const keys = new Set<string>()
  const sectionKeys = new Set<string>()

  function add(field: PlaybookOptionField) {
    if (keys.has(field.key)) {
      throw new Error(`Duplicate playbook option "${field.key}".`)
    }

    keys.add(field.key)
    fields.push(field)
  }

  for (const section of setup) {
    assertUniqueKey(sectionKeys, section.key, "setup section")

    if (section.kind === "fields") {
      for (const field of section.fields) {
        add(field)
      }
      continue
    }

    for (const behavior of section.behaviors) {
      assertUniqueKey(behaviorKeys, behavior.key, "playbook behavior")

      if (behavior.enabledBy !== undefined) {
        add(behavior.enabledBy)
      }
      for (const field of behavior.fields) {
        add(field)
      }
    }
  }

  return fields
}

export function isPlaybookBehaviorEnabled(
  behavior: PlaybookBehavior,
  values: PlaybookOptionValues
) {
  return (
    behavior.enabledBy === undefined || values[behavior.enabledBy.key] === true
  )
}

/**
 * Defaults for every field, overlaid with the caller's picks where the field
 * is enabled. Disabled fields revert to their defaults, so resolved values
 * always carry every key and templates can reference them unconditionally.
 */
export function resolvePlaybookOptions(
  setup: readonly PlaybookSetupSection[] = [],
  values: PlaybookOptionValues = {}
): PlaybookOptionValues {
  const fields = playbookOptionFields(setup)
  assertKnownOptionKeys(fields, values)

  const merged: PlaybookOptionValues = {}

  for (const field of fields) {
    const provided = values[field.key]

    merged[field.key] =
      provided === undefined ? field.default : validOptionValue(field, provided)
  }

  const resolved: PlaybookOptionValues = {}

  for (const field of fields) {
    resolved[field.key] = isPlaybookOptionEnabled(field, fields, merged)
      ? merged[field.key]
      : field.default
  }

  return resolved
}

export function isPlaybookOptionEnabled(
  field: PlaybookOptionField,
  fields: readonly PlaybookOptionField[],
  values: PlaybookOptionValues,
  seen: ReadonlySet<string> = new Set()
): boolean {
  const when = field.enabledWhen

  if (when === undefined) {
    return true
  }

  if (seen.has(field.key)) {
    throw new Error(`Circular option dependency: ${field.key}`)
  }

  const target = fields.find((candidate) => candidate.key === when.key)

  if (target === undefined) {
    throw new Error(`Unknown option dependency "${when.key}".`)
  }

  return (
    isPlaybookOptionEnabled(
      target,
      fields,
      values,
      new Set(seen).add(field.key)
    ) && values[when.key] === when.value
  )
}

function assertUniqueKey(keys: Set<string>, key: string, kind: string) {
  if (keys.has(key)) {
    throw new Error(`Duplicate ${kind} "${key}".`)
  }
  keys.add(key)
}

function validOptionValue(
  field: PlaybookOptionField,
  value: PlaybookOptionValue
): PlaybookOptionValue {
  if (field.kind === "boolean") {
    if (typeof value === "boolean") {
      return value
    }
  }

  if (field.kind === "choice") {
    if (field.choices.some((choice) => choice.value === value)) {
      return value
    }
  }

  if (field.kind === "time") {
    if (
      typeof value === "string" &&
      /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
    ) {
      return value
    }
  }

  if (field.kind === "minutes") {
    if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= field.min &&
      value <= field.max
    ) {
      return value
    }
  }

  throw new Error(`Invalid value for playbook option "${field.key}".`)
}

function assertKnownOptionKeys(
  fields: readonly PlaybookOptionField[],
  values: PlaybookOptionValues
) {
  const known = new Set(fields.map((field) => field.key))

  for (const key of Object.keys(values)) {
    if (!known.has(key)) {
      throw new Error(`Unknown playbook option "${key}".`)
    }
  }
}
