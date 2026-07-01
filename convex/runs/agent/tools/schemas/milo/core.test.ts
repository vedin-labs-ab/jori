import { expect, test } from "vitest"
import { toolFinalDescription } from "../../../../../../contracts/runtime"
import { coreMiloToolInputSchemas } from "./core"

test("integration offers use shared final semantics instead of wait", () => {
  const schema = coreMiloToolInputSchemas.offer_integration as {
    properties: Record<string, unknown>
  }

  expect(coreMiloToolInputSchemas.offer_integration).toMatchObject({
    properties: {
      final: {
        description: toolFinalDescription,
        type: "boolean",
      },
    },
  })
  expect(schema.properties.wait).toBeUndefined()
})

test("run search schema tells agents to omit unused optional fields", () => {
  const schema = coreMiloToolInputSchemas.search_runs as {
    description: string
    properties: Record<string, { description?: string }>
  }

  expect(schema.description).toContain("Omit optional fields")
  expect(schema.properties.since.description).toContain("Omit instead")
  expect(schema.properties.runIds.description).toContain("empty array")
  expect(schema.properties.cursor.description).toContain("first page")
})
