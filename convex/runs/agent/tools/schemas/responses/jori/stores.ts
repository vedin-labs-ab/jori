import {
  arrayProperty,
  booleanProperty,
  numberProperty,
  objectSchema,
  type SchemaMap,
  stringProperty,
} from "../common"

function storeSummaryProperties() {
  return {
    storeId: stringProperty("Jori store ID."),
    name: stringProperty("Store name."),
    description: stringProperty("Store description; absent when unset."),
    scope: stringProperty("personal or organization."),
    ownerId: stringProperty("Owning person ID."),
    schema: {
      type: "object",
      additionalProperties: true,
      description: "The JSON Schema every value write must satisfy.",
    },
    schemaHash: stringProperty("Content hash of the schema."),
    createdAt: numberProperty("Creation time in epoch milliseconds."),
    updatedAt: numberProperty("Last update time in epoch milliseconds."),
    archivedAt: numberProperty("Archive time; absent while active."),
  }
}

export const storeToolResponseSchemas = {
  search_stores: arrayProperty(
    "Accessible stores matching the query, most recently updated first.",
    objectSchema({
      description: "Compact store summary.",
      properties: storeSummaryProperties(),
    })
  ),
  create_store: objectSchema({
    description: "The created store.",
    properties: storeSummaryProperties(),
  }),
  read_store: {
    type: ["object", "null"],
    additionalProperties: false,
    description: "The store with its current value; null when not found.",
    properties: {
      ...storeSummaryProperties(),
      value: {
        description: "The stored JSON document; null before the first write.",
      },
      version: numberProperty(
        "Value version, incremented per write; 0 before the first write."
      ),
    },
  },
  write_store: {
    description:
      "The written value summary. Claim writes add claimed: true when this call won; a held claim returns claimed: false with the existing value and no write.",
    oneOf: [
      objectSchema({
        description: "The write landed.",
        properties: {
          storeId: stringProperty("Jori store ID."),
          name: stringProperty("Store name."),
          value: { description: "The stored JSON document after the write." },
          version: numberProperty("New value version."),
          updatedAt: numberProperty("Write time in epoch milliseconds."),
          claimed: booleanProperty("True when a claim write won."),
        },
      }),
      objectSchema({
        description: "A claim was already held; nothing was written.",
        required: ["claimed", "version"],
        properties: {
          claimed: { type: "boolean", const: false },
          existing: { description: "The value already stored at the path." },
          version: numberProperty("Current value version."),
        },
      }),
    ],
  },
  share_store: objectSchema({
    required: ["url", "expiresAt"],
    properties: {
      url: stringProperty("View-only share link."),
      expiresAt: numberProperty("Expiry time in epoch milliseconds."),
    },
  }),
} satisfies SchemaMap
