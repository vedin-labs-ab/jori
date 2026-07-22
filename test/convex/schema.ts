import { isRecord } from "../../contracts/json"

// Minimal structural validator for the response-schema subset this folder
// uses (type, const, enum, required, properties, additionalProperties,
// items, oneOf). Fixture tests run broker outputs through it so the
// documented schemas cannot drift from what the code returns.

export function schemaViolations(
  value: unknown,
  schema: unknown,
  path = "$"
): string[] {
  if (typeof schema !== "object" || schema === null) {
    return [`${path}: schema is not an object`]
  }

  const rules = schema as Record<string, unknown>

  if (Array.isArray(rules.oneOf)) {
    return rules.oneOf.some(
      (variant) => schemaViolations(value, variant, path).length === 0
    )
      ? []
      : [`${path}: matches no oneOf variant`]
  }

  return [
    ...literalViolations(value, rules, path),
    ...typeViolations(value, rules, path),
    ...objectViolations(value, rules, path),
    ...itemViolations(value, rules, path),
  ]
}

function literalViolations(
  value: unknown,
  rules: Record<string, unknown>,
  path: string
) {
  if (rules.const !== undefined && value !== rules.const) {
    return [`${path}: expected const ${String(rules.const)}`]
  }

  if (Array.isArray(rules.enum) && !rules.enum.includes(value)) {
    return [`${path}: not in enum`]
  }

  return []
}

function typeViolations(
  value: unknown,
  rules: Record<string, unknown>,
  path: string
) {
  if (rules.type === undefined) {
    return []
  }

  const allowed = Array.isArray(rules.type) ? rules.type : [rules.type]

  return allowed.some((type) => matchesType(value, type))
    ? []
    : [`${path}: expected ${allowed.join(" | ")}, got ${describe(value)}`]
}

function objectViolations(
  value: unknown,
  rules: Record<string, unknown>,
  path: string
) {
  if (!isRecord(rules.properties) || !isRecord(value)) {
    return []
  }

  const violations: string[] = []

  for (const key of Array.isArray(rules.required) ? rules.required : []) {
    if (value[String(key)] === undefined) {
      violations.push(`${path}.${String(key)}: required field is missing`)
    }
  }

  for (const [key, entry] of Object.entries(value)) {
    const propertySchema = rules.properties[key]

    if (propertySchema === undefined) {
      if (rules.additionalProperties === false) {
        violations.push(`${path}.${key}: unexpected field`)
      }
      continue
    }

    if (entry !== undefined) {
      violations.push(
        ...schemaViolations(entry, propertySchema, `${path}.${key}`)
      )
    }
  }

  return violations
}

function itemViolations(
  value: unknown,
  rules: Record<string, unknown>,
  path: string
) {
  if (rules.items === undefined || !Array.isArray(value)) {
    return []
  }

  return value.flatMap((item, index) =>
    schemaViolations(item, rules.items, `${path}[${index}]`)
  )
}

function matchesType(value: unknown, type: unknown) {
  switch (type) {
    case "null":
      return value === null
    case "array":
      return Array.isArray(value)
    case "object":
      return isRecord(value)
    case "integer":
      return typeof value === "number" && Number.isInteger(value)
    default:
      return typeof value === type
  }
}

function describe(value: unknown) {
  return value === null ? "null" : Array.isArray(value) ? "array" : typeof value
}
