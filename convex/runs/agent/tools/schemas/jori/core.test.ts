import { expect, test } from "vitest"
import { toolFinalDescription } from "../../../../../../contracts/runtime/tools"
import { coreJoriToolInputSchemas } from "./core"

test("integration offers use shared final semantics instead of wait", () => {
  const schema = coreJoriToolInputSchemas.offer_integration as {
    properties: Record<string, unknown>
  }

  expect(coreJoriToolInputSchemas.offer_integration).toMatchObject({
    properties: {
      final: {
        description: toolFinalDescription,
        type: "boolean",
      },
    },
  })
  expect(schema.properties.wait).toBeUndefined()
})
