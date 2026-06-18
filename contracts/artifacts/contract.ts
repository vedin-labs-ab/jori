import { assertJsonSerializable, isRecord, stableHash } from "./json"
import {
  assertJsonSchemaValue,
  assertSupportedJsonSchema,
  normalizeJsonSchema,
} from "./schema"

export type ArtifactContract = {
  version: number
  state: ArtifactContractStateEntry[]
}

export type ArtifactContractStateEntry = {
  name: string
  key: string
  scope: "personal" | "shared"
  description?: string
  schemaName: string
  schemaVersion: number
  schemaHash: string
  schema: Record<string, unknown>
}

const emptyContract: ArtifactContract = {
  version: 1,
  state: [],
}
const maxContractBytes = 128 * 1024
const maxSchemaBytes = 64 * 1024
const maxStateEntries = 50
const maxStateBytes = 256 * 1024
const namePattern = /^[A-Za-z][A-Za-z0-9_]{0,63}$/

export function normalizeArtifactContract(value: unknown): ArtifactContract {
  if (value === undefined || value === null) {
    return emptyContract
  }

  if (!isRecord(value)) {
    throw new Error("Artifact contract must be an object.")
  }

  const contract = {
    version: normalizePositiveInteger(value.version, "contract.version"),
    state: normalizeStateEntries(value.state),
  }

  assertJsonSerializable({
    label: "Artifact contract",
    maxBytes: maxContractBytes,
    value: contract,
  })

  return contract
}

export function resolveArtifactStateContract(
  contract: ArtifactContract | undefined,
  contractName: string
) {
  const entry = (contract ?? emptyContract).state.find(
    (candidate) => candidate.name === contractName
  )

  if (entry === undefined) {
    throw new Error(`Artifact state contract is missing: ${contractName}`)
  }

  return entry
}

export function assertContractStateValue(input: {
  entry: ArtifactContractStateEntry
  value: unknown
}) {
  assertJsonSerializable({
    label: `Artifact state ${input.entry.name}`,
    maxBytes: maxStateBytes,
    value: input.value,
  })
  assertJsonSchemaValue({
    label: input.entry.name,
    schema: input.entry.schema,
    value: input.value,
  })
}

function normalizeStateEntries(value: unknown) {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new Error("Artifact contract state must be an array.")
  }

  if (value.length > maxStateEntries) {
    throw new Error(
      `Artifact contract can define at most ${maxStateEntries} state entries.`
    )
  }

  const names = new Set<string>()
  const keys = new Set<string>()

  return value.map((entry) => normalizeStateEntry(entry, names, keys))
}

function normalizeStateEntry(
  value: unknown,
  names: Set<string>,
  keys: Set<string>
): ArtifactContractStateEntry {
  if (!isRecord(value)) {
    throw new Error("Artifact contract state entries must be objects.")
  }

  const name = normalizeName(value.name, "contract.state.name")
  const key = normalizeStateKey(value.key)
  const scope = value.scope === "shared" ? "shared" : "personal"
  const schema = normalizeContractSchema(value.schema, name)
  const keySignature = `${scope}:${key}`

  if (names.has(name)) {
    throw new Error(`Duplicate artifact contract state name: ${name}`)
  }

  if (keys.has(keySignature)) {
    throw new Error(`Duplicate artifact contract state key: ${keySignature}`)
  }

  names.add(name)
  keys.add(keySignature)

  return {
    name,
    key,
    scope,
    description: normalizeOptionalDescription(value.description),
    schema,
    schemaHash: stableHash(schema),
    schemaName: normalizeName(value.schemaName ?? name, "schemaName"),
    schemaVersion: normalizePositiveInteger(
      value.schemaVersion ?? 1,
      "schemaVersion"
    ),
  }
}

function normalizeContractSchema(value: unknown, name: string) {
  const schema = normalizeJsonSchema(value, `Artifact state schema ${name}`)

  assertSupportedJsonSchema(schema)
  assertJsonSerializable({
    label: `Artifact state schema ${name}`,
    maxBytes: maxSchemaBytes,
    value: schema,
  })

  return schema
}

function normalizeName(value: unknown, label: string) {
  if (typeof value !== "string" || !namePattern.test(value)) {
    throw new Error(
      `${label} must start with a letter and use letters, numbers, or underscores.`
    )
  }

  return value
}

function normalizeStateKey(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Artifact contract state key must be a string.")
  }

  const key = value.trim()

  if (key === "" || key.length > 160) {
    throw new Error("Artifact contract state key must be 1-160 characters.")
  }

  return key
}

function normalizePositiveInteger(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`)
  }

  return value
}

function normalizeOptionalDescription(value: unknown) {
  if (typeof value !== "string") {
    return undefined
  }

  const description = value.trim()

  return description === "" ? undefined : description.slice(0, 500)
}
