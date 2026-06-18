import { z } from "zod"
import {
  type ArtifactContract,
  type ArtifactContractJson,
  type ArtifactStateContractJson,
  type ArtifactStateDefinition,
  type ArtifactStateRef,
  type JsonObject,
} from "./types"

type ContractInput<TState extends Record<string, ArtifactStateDefinition>> = {
  state: TState
  version?: number
}

export function defineArtifactContract<
  TState extends Record<string, ArtifactStateDefinition>,
>(
  input: ContractInput<TState>
): ArtifactContract<{
  [Key in keyof TState]: ArtifactStateRef<TState[Key]["schema"]>
}> {
  const state = Object.fromEntries(
    Object.entries(input.state).map(([name, definition]) => [
      name,
      createStateRef(name, definition),
    ])
  ) as {
    [Key in keyof TState]: ArtifactStateRef<TState[Key]["schema"]>
  }

  return {
    version: input.version ?? 1,
    state,
    toJSON: () => ({
      version: input.version ?? 1,
      state: Object.values(state).map((entry) => entry.toJSON()),
    }),
  }
}

export function toJsonObjectSchema(schema: z.ZodType) {
  const outputSchema = normalizeJsonSchema(
    z.toJSONSchema(schema, {
      cycles: "throw",
      reused: "inline",
    })
  )

  if (!isJsonObject(outputSchema) || outputSchema.type !== "object") {
    throw new Error("Artifact schemas must be strict Zod object schemas.")
  }

  return outputSchema
}

export function parseStateValue<TSchema extends z.ZodType>(
  ref: ArtifactStateRef<TSchema>,
  value: unknown
): z.output<TSchema> {
  const parsed = ref.schema.safeParse(value)

  if (!parsed.success) {
    throw new Error(
      `Artifact state ${ref.name} failed schema validation: ${formatZodError(parsed.error)}`
    )
  }

  return parsed.data
}

function createStateRef<TSchema extends z.ZodType>(
  name: string,
  definition: ArtifactStateDefinition<TSchema>
): ArtifactStateRef<TSchema> {
  const jsonSchema = toJsonObjectSchema(definition.schema)
  const schemaVersion = definition.schemaVersion ?? 1
  const schemaName = definition.schemaName ?? name

  return {
    name,
    key: definition.key,
    scope: definition.scope ?? "personal",
    description: definition.description,
    schema: definition.schema,
    schemaHash: stableHash(jsonSchema),
    schemaName,
    schemaVersion,
    toJSON: (): ArtifactStateContractJson => ({
      name,
      key: definition.key,
      scope: definition.scope ?? "personal",
      description: definition.description,
      schema: jsonSchema,
      schemaHash: stableHash(jsonSchema),
      schemaName,
      schemaVersion,
    }),
  }
}

function formatZodError(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length === 0 ? "value" : issue.path.join(".")

      return `${path}: ${issue.message}`
    })
    .join("; ")
}

function stableHash(value: unknown) {
  const source = stableJson(value)
  let hash = 2_166_136_261

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }

  return (hash >>> 0).toString(16).padStart(8, "0")
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null"
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`
  }

  const entries = Object.entries(value)
    .filter((entry) => entry[1] !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))

  return `{${entries
    .map(
      ([key, entryValue]) => `${JSON.stringify(key)}:${stableJson(entryValue)}`
    )
    .join(",")}}`
}

function normalizeJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJsonSchema)
  }

  if (!isJsonObject(value)) {
    return value
  }

  const normalized: JsonObject = {}

  for (const [key, entryValue] of Object.entries(value)) {
    if (key === "$schema") {
      continue
    }

    if (key.startsWith("$")) {
      throw new Error(
        `Unsupported JSON Schema keyword ${key}. Artifact schemas must be fully inlined.`
      )
    }

    normalized[key] = normalizeJsonSchema(entryValue)
  }

  return normalized
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export type {
  ArtifactContract,
  ArtifactContractJson,
  ArtifactStateContractJson,
  ArtifactStateDefinition,
  ArtifactStateRef,
}
