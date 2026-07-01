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

  expect(schema).toMatchObject({
    description: expect.stringContaining(optionalFieldGuidance),
    properties: {
      cursor: {
        description: "Opaque cursor from a previous search_runs response.",
      },
      runIds: { description: "Known run IDs to resolve directly." },
      since: {
        description:
          "Only runs created at or after this positive epoch millisecond.",
      },
    },
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
