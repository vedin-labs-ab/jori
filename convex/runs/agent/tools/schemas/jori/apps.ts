import { shareExpiry } from "../../../../../../contracts/apps/share"
import {
  numberProperty,
  objectSchema,
  stringProperty,
} from "../fragments/common"

const appToolGrantsSchema = () => ({
  type: "array",
  description:
    "Optional app grants over existing tool permission names. Keep this narrow.",
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

const appAccessProperty = {
  type: "string",
  enum: ["personal", "organization"],
  description:
    "Personal apps are owner-only. Organization apps are visible to organization members.",
}

const appWorkspacePathProperty = stringProperty(
  "Path to the app workspace directory under /home/user/workspace/apps. Copy the template there, edit app-owned src/** files, and run npm run check before publishing. The MCP server validates this exact workspace and derives source, build assets, and contract."
)

const appStateProperties = {
  appId: stringProperty(
    "Jori app ID of any accessible app. When omitted in an automation run, defaults to the automation's primary app."
  ),
  contractName: stringProperty(
    "State entry name from the app contract, not the raw state key."
  ),
}

export const appToolInputSchemas = {
  create_app: objectSchema({
    properties: {
      title: stringProperty(
        "Short app title. Required unless template is set."
      ),
      access: appAccessProperty,
      workspacePath: appWorkspacePathProperty,
      template: stringProperty(
        "Playbook template key (for example meeting-briefing) to instantiate instead of building a workspace. Publishes a user-owned copy of that template with its contract; title and access default from the template."
      ),
      message: stringProperty("Optional version message."),
      capabilities: appToolGrantsSchema(),
    },
  }),
  search_apps: objectSchema({
    properties: {
      query: stringProperty("Substring matched against app titles."),
      includeArchived: {
        type: "boolean",
        description: "Also return archived apps.",
      },
      limit: numberProperty("Maximum apps to return.", 1, 100),
    },
  }),
  read_app: objectSchema({
    required: ["appId"],
    properties: {
      appId: stringProperty("Jori app ID."),
      versionId: stringProperty("Optional app version ID."),
    },
  }),
  read_app_state: objectSchema({
    required: ["contractName"],
    properties: appStateProperties,
  }),
  share_app: objectSchema({
    required: ["appId"],
    properties: {
      appId: stringProperty("Jori app ID."),
      expiresInHours: numberProperty(
        "How long the link stays valid, in hours. Defaults to 72. Match the content's shelf life: a meeting briefing might use 24, a weekly review 168.",
        shareExpiry.minHours,
        shareExpiry.maxHours
      ),
    },
  }),
  update_app: objectSchema({
    required: ["appId", "title", "access", "workspacePath"],
    properties: {
      appId: stringProperty("Jori app ID."),
      title: stringProperty("Short app title."),
      access: appAccessProperty,
      workspacePath: appWorkspacePathProperty,
      message: stringProperty("Optional version message."),
      capabilities: appToolGrantsSchema(),
    },
  }),
  update_app_state: objectSchema({
    required: ["contractName"],
    properties: {
      ...appStateProperties,
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
  delete_app: objectSchema({
    required: ["appId"],
    properties: {
      appId: stringProperty("Jori app ID."),
    },
  }),
}
