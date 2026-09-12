import { expect, test } from "vitest"
import { toolPermissions } from "../permissions"
import {
  getToolInputSchema,
  optionalFieldGuidance,
  schemaHasOptionalFields,
} from "./index"

test("permissioned tool schemas with optional fields share omission guidance", () => {
  for (const { tool } of toolPermissions) {
    const schema = getToolInputSchema(tool)
    if (schema !== undefined && schemaHasOptionalFields(schema)) {
      expect(schema, tool).toMatchObject({
        description: expect.stringContaining(optionalFieldGuidance),
      })
    }
  }
})
