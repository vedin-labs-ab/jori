// Playbook options are the typed setup knobs a playbook declares in the
// catalog: the dialog renders them, enablement validates them, and the
// resolved values feed the instruction template and the schedule.

export type PlaybookOptionValues = Record<string, string | number>

type PlaybookOptionBase = {
  key: string
  label: string
  /** Show and apply this field only while another field holds a value.
   *  Predicates chase enablement transitively through their target. */
  enabledWhen?: { key: string; value: string }
}

export type PlaybookOptionField =
  | (PlaybookOptionBase & {
      kind: "choice"
      choices: ReadonlyArray<{ value: string; label: string }>
      default: string
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

/**
 * Defaults for every field, overlaid with the caller's picks where the field
 * is enabled. Disabled fields revert to their defaults, so resolved values
 * always carry every key and templates can reference them unconditionally.
 */
export function resolvePlaybookOptions(
  fields: readonly PlaybookOptionField[] = [],
  values: PlaybookOptionValues = {}
): PlaybookOptionValues {
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

  return (
    target !== undefined &&
    isPlaybookOptionEnabled(
      target,
      fields,
      values,
      new Set(seen).add(field.key)
    ) &&
    values[when.key] === when.value
  )
}

function validOptionValue(
  field: PlaybookOptionField,
  value: string | number
): string | number {
  if (field.kind === "choice") {
    if (field.choices.some((choice) => choice.value === value)) {
      return value
    }
  }

  if (field.kind === "time") {
    if (typeof value === "string" && /^\d{2}:\d{2}$/.test(value)) {
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
