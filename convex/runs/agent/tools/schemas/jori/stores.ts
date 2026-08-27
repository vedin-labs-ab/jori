import {
  numberProperty,
  objectSchema,
  stringProperty,
} from "../fragments/common"

const storeScopeProperty = {
  type: "string",
  enum: ["personal", "organization"],
  description:
    "Personal stores are owner-only. Organization stores are visible to organization members. Defaults to organization.",
}

const storeIdProperty = stringProperty("Jori store ID.")

export const storeToolInputSchemas = {
  search_stores: objectSchema({
    properties: {
      query: stringProperty("Substring matched against store names."),
      includeArchived: {
        type: "boolean",
        description: "Also return archived stores.",
      },
      limit: numberProperty("Maximum stores to return.", 1, 100),
    },
  }),
  create_store: objectSchema({
    required: ["name", "schema"],
    properties: {
      name: stringProperty("Short store name."),
      description: stringProperty("What the store holds and who reads it."),
      scope: storeScopeProperty,
      schema: {
        type: "object",
        additionalProperties: true,
        description:
          "JSON Schema with an object root that every value write must satisfy. Fixed at creation; fully inlined, no $ref.",
      },
    },
  }),
  read_store: objectSchema({
    required: ["storeId"],
    properties: {
      storeId: storeIdProperty,
    },
  }),
  write_store: objectSchema({
    required: ["storeId"],
    properties: {
      storeId: storeIdProperty,
      expectedVersion: numberProperty(
        "Optional optimistic concurrency version from a previous read.",
        0
      ),
      value: {
        description:
          "JSON value to replace the current document. Provide exactly one of value, patch, or claim.",
      },
      patch: {
        description:
          "RFC 7396-style merge patch. Provide exactly one of value, patch, or claim.",
      },
      claim: {
        ...objectSchema({
          required: ["path", "value"],
          properties: {
            path: {
              type: "array",
              items: { type: "string" },
              description:
                'Key path from the document root, for example ["dispatches", "morning:2026-07-18"].',
            },
            value: {
              description: "Non-null JSON value to set at the path.",
            },
          },
        }),
        description:
          "Atomically set path to value only if nothing is stored there yet. Returns claimed: true when this call won the claim, or claimed: false with the existing value and no write. Claim before any action that must happen at most once (sending, posting, notifying); claimed: false means another run owns it — never repeat the action.",
      },
    },
  }),
}
