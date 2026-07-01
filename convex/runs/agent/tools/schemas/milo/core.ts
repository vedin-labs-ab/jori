import { finalProperty } from "../../../../../../contracts/runtime"
import { integrations as integrationEnum } from "../../../../../shared/integrations"
import {
  numberProperty,
  objectSchema,
  stringArrayProperty,
  stringProperty,
} from "../common"

const runStatusEnum = ["queued", "running", "completed", "failed", "stopped"]
const runScopeEnum = ["conversation", "tenant", "all"]
const runSourceEnum = ["slack", "github", "linear", "automation"]
const activityFilterEnum = [
  "tool",
  "model",
  "approval",
  "asset",
  "agent",
  "error",
]

export const coreMiloToolInputSchemas = {
  list_capabilities: objectSchema({
    properties: {},
  }),
  load_skill: loadSkillInputSchema(),
  search_runs: objectSchema({
    description: "Find visible prior runs.",
    properties: {
      query: stringProperty(
        "Substring matched against title, task, and context labels."
      ),
      scope: {
        type: "string",
        enum: runScopeEnum,
        description:
          "Relevance scope within enforced visibility. Defaults to conversation; use tenant or all deliberately.",
      },
      status: {
        type: "string",
        enum: runStatusEnum,
        description: "Run status filter.",
      },
      source: {
        type: "string",
        enum: runSourceEnum,
        description: "Source filter.",
      },
      since: numberProperty(
        "Only runs created at or after this positive epoch millisecond."
      ),
      until: numberProperty(
        "Only runs created at or before this positive epoch millisecond."
      ),
      rootId: stringProperty("Root run ID for delegation-tree navigation."),
      parentId: stringProperty("Parent run ID for direct child navigation."),
      runIds: stringArrayProperty("Known run IDs to resolve directly."),
      cursor: stringProperty(
        "Opaque cursor from a previous search_runs response."
      ),
      limit: numberProperty("Maximum runs to return. Defaults to 15.", 1, 50),
    },
  }),
  search_run_activity: objectSchema({
    description: "Inspect one visible prior run.",
    required: ["runId"],
    properties: {
      runId: stringProperty("Run ID returned by search_runs."),
      filter: {
        type: "array",
        description: "Optional activity kinds to include.",
        items: {
          type: "string",
          enum: activityFilterEnum,
        },
      },
      cursor: stringProperty(
        "Opaque cursor from a previous search_run_activity response."
      ),
      limit: numberProperty(
        "Maximum activity items to return. Defaults to 20.",
        1,
        50
      ),
    },
  }),
  offer_integration: objectSchema({
    required: ["integration", "summary"],
    properties: {
      integration: {
        type: "string",
        description: "Integration the user wants to connect.",
        enum: integrationEnum,
      },
      summary: stringProperty(
        "One concise user-facing sentence explaining why this integration needs to be connected for the current request."
      ),
      final: finalProperty(),
    },
  }),
  cancel_approval_request: objectSchema({
    required: ["approvalId", "messageId", "reason"],
    properties: {
      approvalId: stringProperty(
        "ID of the pending approval request to withdraw, returned when you requested it."
      ),
      messageId: stringProperty(
        "Milo internal message id for the user message that requested this cancellation. Use the value after internal:message: from that message's identifiers list. Do not pass Slack, GitHub, or Linear message ids."
      ),
      reason: stringProperty(
        "Short explanation of why the request is no longer needed."
      ),
    },
  }),
  cancel_integration_offer: objectSchema({
    required: ["integrationOfferId", "reason"],
    properties: {
      integrationOfferId: stringProperty(
        "ID of the pending integration offer to withdraw, returned when you offered it."
      ),
      reason: stringProperty(
        "Short explanation of why the offer is no longer needed."
      ),
    },
  }),
  save_asset: objectSchema({
    required: ["path"],
    properties: {
      path: stringProperty(
        "Local sandbox file path to persist as a run asset for tools that send assets."
      ),
      name: stringProperty("Optional filename to show to recipients."),
      mimeType: stringProperty(
        "Optional content type, for example image/png or application/pdf."
      ),
      description: stringProperty("Optional short description of the asset."),
    },
  }),
  generate_image: objectSchema({
    required: ["prompt"],
    properties: {
      prompt: stringProperty("Complete image generation prompt."),
      save: objectSchema({
        properties: {
          name: stringProperty("Optional generated image filename."),
          description: stringProperty("Optional asset description."),
        },
      }),
    },
  }),
  search_assets: objectSchema({
    properties: {
      query: stringProperty(
        "Substring matched against asset names, descriptions, and content types."
      ),
      mimeType: stringProperty(
        "Optional content type filter, for example image/png or image/."
      ),
      limit: numberProperty("Maximum assets to return.", 1, 100),
    },
  }),
  read_asset: objectSchema({
    required: ["assetId"],
    properties: {
      assetId: stringProperty("Asset ID."),
    },
  }),
  web_search: objectSchema({
    required: ["query"],
    properties: {
      query: stringProperty("Public web search query."),
      limit: numberProperty("Maximum search results to return.", 1, 10),
      includeDomains: stringArrayProperty(
        "Optional public domains to include, such as example.com."
      ),
      excludeDomains: stringArrayProperty(
        "Optional public domains to exclude, such as example.com."
      ),
      maxCharacters: numberProperty(
        "Maximum text characters to return per result.",
        250,
        4000
      ),
    },
  }),
  web_fetch: objectSchema({
    required: ["url"],
    properties: {
      url: stringProperty("Public http(s) URL to fetch."),
      highlightQuery: stringProperty(
        "Optional query used to extract highlights from the page."
      ),
      maxCharacters: numberProperty(
        "Maximum text characters to return from the page.",
        1000,
        20000
      ),
    },
  }),
}

export function loadSkillInputSchema(skillNames: readonly string[] = []) {
  return objectSchema({
    required: ["name"],
    properties: {
      name: {
        type: "string",
        description: "Available Milo skill name.",
        ...(skillNames.length === 0 ? {} : { enum: skillNames }),
      },
    },
  })
}
