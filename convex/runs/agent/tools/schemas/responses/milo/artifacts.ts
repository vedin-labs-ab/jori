import {
  booleanField,
  type JsonSchema,
  listField,
  numberField,
  providerPayload,
  resultSchema,
  type SchemaMap,
  stringField,
} from "../common"

function artifactSummaryProperties() {
  return {
    artifactId: stringField("Milo artifact ID."),
    title: stringField("Artifact title."),
    access: stringField("personal or organization."),
    contract: providerPayload("The artifact's contract document."),
    ownerId: stringField("Owning person ID."),
    versionId: stringField("Current version ID."),
    createdAt: numberField("Creation time in epoch milliseconds."),
    updatedAt: numberField("Last update time in epoch milliseconds."),
    archivedAt: numberField("Archive time; absent while active."),
  }
}

function artifactSummary(description: string): JsonSchema {
  return resultSchema({
    description,
    properties: artifactSummaryProperties(),
  })
}

function publishResult(description: string): JsonSchema {
  return resultSchema({
    description,
    required: ["artifactId", "versionId", "urlPath"],
    properties: {
      artifactId: stringField("Milo artifact ID."),
      versionId: stringField("Published version ID."),
      url: stringField("Absolute console URL when the host is configured."),
      urlPath: stringField("Console path for the artifact."),
    },
  })
}

function stateSummaryProperties() {
  return {
    contractName: stringField("State entry name from the contract."),
    key: stringField("Raw state key."),
    scope: stringField("State scope from the contract entry."),
    schemaHash: stringField("Hash of the entry's schema."),
    schemaName: stringField("Schema name from the contract entry."),
    schemaVersion: numberField("Schema version from the contract entry."),
    value: { description: "The stored JSON state document." },
    version: numberField("Document version, incremented per write."),
    updatedAt: numberField("Last write time in epoch milliseconds."),
  }
}

export const artifactToolResponseSchemas = {
  create_artifact: publishResult("The published artifact and version."),
  update_artifact: publishResult("The published artifact and version."),
  search_artifacts: listField(
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
      source: listField(
        "Source files of the requested version.",
        resultSchema({
          properties: {
            path: stringField("Workspace-relative file path."),
            content: stringField("File content."),
            blobId: stringField("Content blob ID."),
            mimeType: stringField("File content type."),
            byteSize: numberField("File size in bytes."),
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
      resultSchema({
        description: "The write landed.",
        properties: {
          ...stateSummaryProperties(),
          claimed: booleanField("True when a claim write won."),
        },
      }),
      resultSchema({
        description: "A claim was already held; nothing was written.",
        required: ["claimed", "version"],
        properties: {
          claimed: { type: "boolean", const: false },
          existing: { description: "The value already stored at the path." },
          version: numberField("Current document version."),
        },
      }),
    ],
  },
  share_artifact: resultSchema({
    required: ["url", "expiresAt"],
    properties: {
      url: stringField("View-only share link."),
      expiresAt: numberField("Expiry time in epoch milliseconds."),
    },
  }),
  delete_artifact: {
    description:
      "Archives an active artifact; deleting an already archived artifact purges it permanently.",
    oneOf: [
      resultSchema({
        required: ["artifactId", "archived"],
        properties: {
          artifactId: stringField("Milo artifact ID."),
          archived: { type: "boolean", const: true },
        },
      }),
      resultSchema({
        required: ["artifactId", "deleted"],
        properties: {
          artifactId: stringField("Milo artifact ID."),
          deleted: { type: "boolean", const: true },
          deletedAssets: numberField("Assets removed."),
          deletedBlobs: numberField("Content blobs removed."),
          deletedTrees: numberField("Source trees removed."),
          deletedVersions: numberField("Versions removed."),
        },
      }),
    ],
  },
} satisfies SchemaMap
