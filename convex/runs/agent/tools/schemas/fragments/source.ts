import { booleanProperty, objectSchema, stringProperty } from "./common"

export function sourceChangesProperty() {
  return {
    type: "object",
    additionalProperties: false,
    description:
      "System-populated normalized source changes. Omit when using local workspace changes.",
    required: ["files"],
    properties: {
      baseSha: stringProperty("Base Git object SHA."),
      files: {
        type: "array",
        items: {
          oneOf: [
            objectSchema({
              required: ["operation", "path", "content"],
              properties: {
                content: stringProperty("UTF-8 text file content."),
                executable: booleanProperty("Whether the file is executable."),
                operation: {
                  type: "string",
                  enum: ["upsert"],
                  description: "Create or update the file.",
                },
                path: stringProperty("Repository-relative file path."),
              },
            }),
            objectSchema({
              required: ["operation", "path"],
              properties: {
                operation: {
                  type: "string",
                  enum: ["delete"],
                  description: "Delete the file.",
                },
                path: stringProperty("Repository-relative file path."),
              },
            }),
          ],
        },
      },
      headSha: stringProperty("Current local Git HEAD SHA."),
    },
  }
}
