import Ajv from "ajv"
import { isRecord } from "../../contracts/json"

// An independent JSON Schema implementation checks the contracts. Using the
// production validator here would allow the same bug to pass both sides.
const validator = new Ajv({ allErrors: true, strictTypes: false })
validator.addFormat("uri", (value: string) => URL.canParse(value))

export function compileSchema(schema: unknown) {
  if (!isRecord(schema)) {
    throw new Error("Schema must be an object")
  }
  return validator.compile(schema)
}

export function schemaViolations(value: unknown, schema: unknown, path = "$") {
  const validate = compileSchema(schema)
  if (validate(value)) {
    return []
  }
  return (validate.errors ?? []).map(
    (error) => `${path}${error.instancePath}: ${error.message}`
  )
}
