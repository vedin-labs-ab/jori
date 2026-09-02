import { expect, test } from "vitest"
import { jobJoriToolInputSchemas } from "./jobs"

test.each([
  "add_job",
  "update_job",
] as const)("%s explains canonical instruction syntax", (tool) => {
  const instructions = readProperties(
    jobJoriToolInputSchemas[tool]
  ).instructions

  expect(instructions).toMatchObject({
    description: expect.stringContaining("Canonical Markdown"),
    type: "string",
  })
  expect(readDescription(instructions)).toContain("@Integration")
  expect(readDescription(instructions)).toContain("/skill")
  expect(readDescription(instructions)).toContain("#tool")
  expect(readDescription(instructions)).toContain("txt fences")
  expect(readDescription(instructions)).toContain("explicit access")
})

function readProperties(schema: Record<string, unknown>) {
  const properties = schema.properties

  return isRecord(properties) ? properties : {}
}

function readDescription(value: unknown) {
  return isRecord(value) && typeof value.description === "string"
    ? value.description
    : ""
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
