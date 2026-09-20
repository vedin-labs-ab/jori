export type JsonSchemaObject = Record<string, unknown>

export type SchemaValidationIssue = {
  path: string
  message: string
}
