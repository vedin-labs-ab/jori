import { shareExpiry } from "../../../../../../contracts/artifacts/share"
import {
  numberProperty,
  objectSchema,
  stringProperty,
} from "../fragments/common"

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
    "Personal artifacts are owner-only. Organization artifacts are visible to organization members.",
}

const artifactWorkspacePathProperty = stringProperty(
  "Path to the artifact workspace directory under /home/user/workspace/artifacts. Copy the template there, edit artifact-owned src/** files, and run npm run check before publishing. The MCP server validates this exact workspace and derives source, build assets, and contract."
)

const artifactStateProperties = {
  artifactId: stringProperty(
    "Milo artifact ID of any accessible artifact. When omitted in an automation run, defaults to the automation's primary artifact."
  ),
  contractName: stringProperty(
    "State entry name from the artifact contract, not the raw state key."
  ),
}

export const artifactToolInputSchemas = {
  create_artifact: objectSchema({
    properties: {
      title: stringProperty(
        "Short artifact title. Required unless template is set."
      ),
      access: artifactAccessProperty,
      workspacePath: artifactWorkspacePathProperty,
      template: stringProperty(
        "Playbook template key (for example meeting-briefing) to instantiate instead of building a workspace. Publishes a user-owned copy of that template with its contract; title and access default from the template."
      ),
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
        "How long the link stays valid, in hours. Defaults to 72. Match the content's shelf life: a meeting briefing might use 24, a weekly review 168.",
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
          "JSON value to replace the current state document. Provide exactly one of value, patch, or claim.",
      },
      patch: {
        description:
          "RFC 7396-style state merge patch. Provide exactly one of value, patch, or claim.",
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
  delete_artifact: objectSchema({
    required: ["artifactId"],
    properties: {
      artifactId: stringProperty("Milo artifact ID."),
    },
  }),
}
