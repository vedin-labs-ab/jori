import { expect, test } from "vitest"
import { toolPermissions } from "../../../../../contracts/permissions"
import {
  getToolInputSchema,
  optionalFieldGuidance,
  schemaHasOptionalFields,
} from "./index"

type ToolSchemaEntry = {
  schema: Record<string, unknown>
  tool: string
}

test("permissioned tool schemas with optional fields share omission guidance", () => {
  const missingGuidance = toolPermissions
    .map((permission) => ({
      schema: getToolInputSchema(permission.tool),
      tool: permission.tool,
    }))
    .filter(hasSchema)
    .filter(({ schema }) => schemaHasOptionalFields(schema))
    .filter(
      ({ schema }) => !schemaDescription(schema).includes(optionalFieldGuidance)
    )
    .map(({ tool }) => tool)

  expect(missingGuidance).toEqual([])
})

test("run search exposes optional filters without bespoke sentinel guidance", () => {
  const schema = getToolInputSchema("search_runs")
  const variants = readVariants(schema)

  expect(schema).toMatchObject({
    description: expect.stringContaining(optionalFieldGuidance),
  })
  expect(variants.map(readMode)).toEqual(["search", "ids", "children", "tree"])
  expect(variants.every((variant) => hasRequired(variant, "mode"))).toBe(true)
  expect(properties(variants[0]).runIds).toBeUndefined()
  expect(properties(variants[1]).query).toBeUndefined()
  expect(properties(variants[1]).runIds).toMatchObject({
    description: "Known run IDs returned by search_runs.",
  })
  expect(schema?.required).toBeUndefined()
})

function schemaDescription(schema: Record<string, unknown> | undefined) {
  return typeof schema?.description === "string" ? schema.description : ""
}

function hasSchema(entry: {
  schema: Record<string, unknown> | undefined
  tool: string
}): entry is ToolSchemaEntry {
  return entry.schema !== undefined
}

function readVariants(schema: Record<string, unknown> | undefined) {
  return Array.isArray(schema?.oneOf) ? schema.oneOf.filter(isRecord) : []
}

function readMode(schema: Record<string, unknown>) {
  const mode = properties(schema).mode

  return isRecord(mode) && Array.isArray(mode.enum) ? mode.enum[0] : undefined
}

function hasRequired(schema: Record<string, unknown>, key: string) {
  return Array.isArray(schema.required) && schema.required.includes(key)
}

function properties(schema: Record<string, unknown>) {
  return isRecord(schema.properties) ? schema.properties : {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
