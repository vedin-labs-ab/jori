import { shareExpiry } from "../../../../../contracts/artifacts/share"
import { numberProperty, objectSchema, stringProperty } from "./common"

const artifactToolGrantsSchema = () => ({
  type: "array",
  description:
    "Optional artifact grants over existing tool permission names. Keep this narrow.",
  items: objectSchema({
    required: ["tool"],
    properties: {
      tool: stringProperty("Existing tool permission name."),
      integrationId: stringProperty("Optional integration ID for the grant."),
      versionPinned: {
        type: "boolean",
        description: "Pin this grant to the version being published.",
      },
    },
  }),
})

const artifactAccessProperty = {
  type: "string",
  enum: ["personal", "organization"],
  description:
    "Personal artifacts are owner-only. Organization artifacts are visible to tenant members.",
}

const artifactWorkspacePathProperty = stringProperty(
  "Path to the artifact workspace directory under /home/user/workspace/artifacts. Copy the template there, edit artifact-owned src/** files, and run npm run check before publishing. The MCP server validates this exact workspace and derives source, build assets, and contract."
)

const artifactStateProperties = {
  artifactId: stringProperty(
    "Milo artifact ID. Artifact-owned automation runs may omit this because Milo can infer it from the run."
  ),
  contractName: stringProperty(
    "State entry name from the artifact contract, not the raw state key."
  ),
}

export const artifactToolInputSchemas = {
  create_artifact: objectSchema({
    required: ["title", "access", "workspacePath"],
    properties: {
      title: stringProperty("Short artifact title."),
      access: artifactAccessProperty,
      workspacePath: artifactWorkspacePathProperty,
      message: stringProperty("Optional version message."),
      capabilities: artifactToolGrantsSchema(),
    },
  }),
  search_artifacts: objectSchema({
    properties: {
      query: stringProperty("Substring matched against artifact titles."),
      includeArchived: {
        type: "boolean",
        description: "Also return archived artifacts.",
      },
      limit: numberProperty("Maximum artifacts to return.", 1, 100),
    },
  }),
  read_artifact: objectSchema({
    required: ["artifactId"],
    properties: {
      artifactId: stringProperty("Milo artifact ID."),
      versionId: stringProperty("Optional artifact version ID."),
    },
  }),
  read_artifact_state: objectSchema({
    required: ["contractName"],
    properties: artifactStateProperties,
  }),
  share_artifact: objectSchema({
    required: ["artifactId"],
    properties: {
      artifactId: stringProperty("Milo artifact ID."),
      expiresInHours: numberProperty(
        "How long the link stays valid, in hours. Defaults to 72. Match the content's shelf life: a meeting prep might use 24, a weekly review 168.",
        shareExpiry.minHours,
        shareExpiry.maxHours
      ),
    },
  }),
  update_artifact: objectSchema({
    required: ["artifactId", "title", "access", "workspacePath"],
    properties: {
      artifactId: stringProperty("Milo artifact ID."),
      title: stringProperty("Short artifact title."),
      access: artifactAccessProperty,
      workspacePath: artifactWorkspacePathProperty,
      message: stringProperty("Optional version message."),
      capabilities: artifactToolGrantsSchema(),
    },
  }),
  update_artifact_state: objectSchema({
    required: ["contractName"],
    properties: {
      ...artifactStateProperties,
      expectedVersion: numberProperty(
        "Optional optimistic concurrency version.",
        0
      ),
      value: {
        description:
          "JSON value to replace the current state document. Provide either value or patch.",
      },
      patch: {
        description:
          "RFC 7396-style state merge patch. Provide either patch or value.",
      },
    },
  }),
  delete_artifact: objectSchema({
    required: ["artifactId"],
    properties: {
      artifactId: stringProperty("Milo artifact ID."),
    },
  }),
}
