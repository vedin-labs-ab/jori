export function withApprovalSchema(schema: Record<string, unknown>) {
  const properties = readObject(schema.properties)
  const required = readStringArray(schema.required)

  return {
    ...schema,
    type: "object",
    properties: {
      ...properties,
      approval: {
        type: "object",
        additionalProperties: false,
        required: ["summary", "handoff"],
        properties: {
          summary: { type: "string" },
          handoff: {
            type: "object",
            additionalProperties: false,
            required: ["objective", "progress", "next"],
            properties: {
              objective: { type: "string" },
              progress: { type: "string" },
              next: { type: "string" },
            },
          },
        },
      },
    },
    required: [...new Set([...required, "approval"])],
  }
}

function readObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value
    : {}
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}
