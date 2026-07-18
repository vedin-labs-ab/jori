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

function artifactSummaryProperties() {
  return {
    artifactId: stringProperty("Milo artifact ID."),
    title: stringProperty("Artifact title."),
    access: stringProperty("personal or organization."),
    contract: providerPayload("The artifact's contract document."),
    ownerId: stringProperty("Owning person ID."),
    versionId: stringProperty("Current version ID."),
    createdAt: numberProperty("Creation time in epoch milliseconds."),
    updatedAt: numberProperty("Last update time in epoch milliseconds."),
    archivedAt: numberProperty("Archive time; absent while active."),
  }
}

function artifactSummary(description: string): JsonSchema {
  return objectSchema({
    description,
    properties: artifactSummaryProperties(),
  })
}

function publishResult(description: string): JsonSchema {
  return objectSchema({
    description,
    required: ["artifactId", "versionId", "urlPath"],
    properties: {
      artifactId: stringProperty("Milo artifact ID."),
      versionId: stringProperty("Published version ID."),
      url: stringProperty("Absolute console URL when the host is configured."),
      urlPath: stringProperty("Console path for the artifact."),
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

export const artifactToolResponseSchemas = {
  create_artifact: publishResult("The published artifact and version."),
  update_artifact: publishResult("The published artifact and version."),
  search_artifacts: arrayProperty(
    "Accessible artifacts matching the query, newest first.",
    artifactSummary("Compact artifact summary.")
  ),
  read_artifact: {
    type: ["object", "null"],
    additionalProperties: false,
    description: "The artifact with its current source; null when not found.",
    properties: {
      ...artifactSummaryProperties(),
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
  read_artifact_state: {
    type: ["object", "null"],
    additionalProperties: false,
    description:
      "The state document summary; null when nothing is stored yet or the entry is not visible.",
    properties: stateSummaryProperties(),
  },
  update_artifact_state: {
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
  share_artifact: objectSchema({
    required: ["url", "expiresAt"],
    properties: {
      url: stringProperty("View-only share link."),
      expiresAt: numberProperty("Expiry time in epoch milliseconds."),
    },
  }),
  delete_artifact: {
    description:
      "Archives an active artifact; deleting an already archived artifact purges it permanently.",
    oneOf: [
      objectSchema({
        required: ["artifactId", "archived"],
        properties: {
          artifactId: stringProperty("Milo artifact ID."),
          archived: { type: "boolean", const: true },
        },
      }),
      objectSchema({
        required: ["artifactId", "deleted"],
        properties: {
          artifactId: stringProperty("Milo artifact ID."),
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
