import {
  arrayProperty,
  booleanProperty,
  type JsonSchema,
  numberProperty,
  objectSchema,
  providerPayload,
  type SchemaMap,
  stringProperty,
} from "../common"

function appSummaryProperties() {
  return {
    appId: stringProperty("Milo app ID."),
    title: stringProperty("App title."),
    access: stringProperty("personal or organization."),
    contract: providerPayload("The app's contract document."),
    ownerId: stringProperty("Owning person ID."),
    versionId: stringProperty("Current version ID."),
    createdAt: numberProperty("Creation time in epoch milliseconds."),
    updatedAt: numberProperty("Last update time in epoch milliseconds."),
    archivedAt: numberProperty("Archive time; absent while active."),
  }
}

function appSummary(description: string): JsonSchema {
  return objectSchema({
    description,
    properties: appSummaryProperties(),
  })
}

function publishResult(description: string): JsonSchema {
  return objectSchema({
    description,
    required: ["appId", "versionId", "urlPath"],
    properties: {
      appId: stringProperty("Milo app ID."),
      versionId: stringProperty("Published version ID."),
      url: stringProperty("Absolute console URL when the host is configured."),
      urlPath: stringProperty("Console path for the app."),
    },
  })
}

function stateSummaryProperties() {
  return {
    contractName: stringProperty("State entry name from the contract."),
    key: stringProperty("Raw state key."),
    scope: stringProperty("State scope from the contract entry."),
    schemaHash: stringProperty("Hash of the entry's schema."),
    schemaName: stringProperty("Schema name from the contract entry."),
    schemaVersion: numberProperty("Schema version from the contract entry."),
    value: { description: "The stored JSON state document." },
    version: numberProperty("Document version, incremented per write."),
    updatedAt: numberProperty("Last write time in epoch milliseconds."),
  }
}

export const appToolResponseSchemas = {
  create_app: publishResult("The published app and version."),
  update_app: publishResult("The published app and version."),
  search_apps: arrayProperty(
    "Accessible apps matching the query, newest first.",
    appSummary("Compact app summary.")
  ),
  read_app: {
    type: ["object", "null"],
    additionalProperties: false,
    description: "The app with its current source; null when not found.",
    properties: {
      ...appSummaryProperties(),
      version: providerPayload(
        "Current version record (versionId, entrypoint, sdk, message, createdBy, createdAt), or null."
      ),
      source: arrayProperty(
        "Source files of the requested version.",
        objectSchema({
          properties: {
            path: stringProperty("Workspace-relative file path."),
            content: stringProperty("File content."),
            blobId: stringProperty("Content blob ID."),
            mimeType: stringProperty("File content type."),
            byteSize: numberProperty("File size in bytes."),
          },
        })
      ),
    },
  },
  read_app_state: {
    type: ["object", "null"],
    additionalProperties: false,
    description:
      "The state document summary; null when nothing is stored yet or the entry is not visible.",
    properties: stateSummaryProperties(),
  },
  update_app_state: {
    description:
      "The written document summary. Claim writes add claimed: true when this call won; a held claim returns claimed: false with the existing value and no write.",
    oneOf: [
      objectSchema({
        description: "The write landed.",
        properties: {
          ...stateSummaryProperties(),
          claimed: booleanProperty("True when a claim write won."),
        },
      }),
      objectSchema({
        description: "A claim was already held; nothing was written.",
        required: ["claimed", "version"],
        properties: {
          claimed: { type: "boolean", const: false },
          existing: { description: "The value already stored at the path." },
          version: numberProperty("Current document version."),
        },
      }),
    ],
  },
  share_app: objectSchema({
    required: ["url", "expiresAt"],
    properties: {
      url: stringProperty("View-only share link."),
      expiresAt: numberProperty("Expiry time in epoch milliseconds."),
    },
  }),
  delete_app: {
    description:
      "Archives an active app; deleting an already archived app purges it permanently.",
    oneOf: [
      objectSchema({
        required: ["appId", "archived"],
        properties: {
          appId: stringProperty("Milo app ID."),
          archived: { type: "boolean", const: true },
        },
      }),
      objectSchema({
        required: ["appId", "deleted"],
        properties: {
          appId: stringProperty("Milo app ID."),
          deleted: { type: "boolean", const: true },
          deletedAssets: numberProperty("Assets removed."),
          deletedBlobs: numberProperty("Content blobs removed."),
          deletedTrees: numberProperty("Source trees removed."),
          deletedVersions: numberProperty("Versions removed."),
        },
      }),
    ],
  },
} satisfies SchemaMap
