import { z } from "zod"
import {
  type AppContract,
  type AppContractJson,
  type AppStateContractJson,
  type AppStateDefinition,
  type AppStateRef,
  type JsonObject,
} from "./types"

type ContractInput<TState extends Record<string, AppStateDefinition>> = {
  state: TState
  version?: number
}

export function defineAppContract<
  TState extends Record<string, AppStateDefinition>,
>(
  input: ContractInput<TState>
): AppContract<{
  [Key in keyof TState]: AppStateRef<TState[Key]["schema"]>
}> {
  const version = input.version ?? 1
  const state = Object.fromEntries(
    Object.entries(input.state).map(([name, definition]) => [
      name,
      createStateRef(name, definition),
    ])
  ) as {
    [Key in keyof TState]: AppStateRef<TState[Key]["schema"]>
  }

  return {
    version,
    state,
    toJSON: () => ({
      version,
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
    throw new Error("App schemas must be strict Zod object schemas.")
  }

  return outputSchema
}

export function parseStateValue<TSchema extends z.ZodType>(
  ref: AppStateRef<TSchema>,
  value: unknown
): z.output<TSchema> {
  const parsed = ref.schema.safeParse(value)

  if (!parsed.success) {
    throw new Error(
      `App state ${ref.name} failed schema validation: ${formatZodError(parsed.error)}`
    )
  }

  return parsed.data
}

function createStateRef<TSchema extends z.ZodType>(
  name: string,
  definition: AppStateDefinition<TSchema>
): AppStateRef<TSchema> {
  const jsonSchema = toJsonObjectSchema(definition.schema)
  const schemaVersion = definition.schemaVersion ?? 1
  const schemaName = definition.schemaName ?? name
  const scope = definition.scope ?? "personal"

  return {
    name,
    key: definition.key,
    scope,
    description: definition.description,
    usage: definition.usage,
    schema: definition.schema,
    schemaHash: stableHash(jsonSchema),
    schemaName,
    schemaVersion,
    toJSON: (): AppStateContractJson => ({
      name,
      key: definition.key,
      scope,
      description: definition.description,
      usage: definition.usage,
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
        `Unsupported JSON Schema keyword ${key}. App schemas must be fully inlined.`
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
  AppContract,
  AppContractJson,
  AppStateContractJson,
  AppStateDefinition,
  AppStateRef,
}
