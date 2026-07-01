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
