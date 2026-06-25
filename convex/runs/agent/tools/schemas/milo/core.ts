import { integrations as integrationEnum } from "../../../../../shared/integrations"
import { runtimeSkillNames } from "../../../../../skills/runtime"
import {
  numberProperty,
  objectSchema,
  stringArrayProperty,
  stringProperty,
} from "../common"

export const coreMiloToolInputSchemas = {
  list_capabilities: objectSchema({
    properties: {},
  }),
  load_skill: objectSchema({
    required: ["name"],
    properties: {
      name: {
        type: "string",
        description: "Available Milo skill name.",
        enum: runtimeSkillNames,
      },
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
      wait: {
        type: "boolean",
        description:
          "Set true to pause the run until this offer is connected, cancelled, or expires when you need the integration to continue. Omit for proactive or optional offers.",
      },
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
  save_attachment: objectSchema({
    required: ["path"],
    properties: {
      path: stringProperty(
        "Local sandbox file path to persist as a run attachment for tools that send attachments."
      ),
      name: stringProperty("Optional filename to show to recipients."),
      mimeType: stringProperty(
        "Optional content type, for example image/png or application/pdf."
      ),
      description: stringProperty(
        "Optional short description of the attachment."
      ),
    },
  }),
  generate_image: objectSchema({
    required: ["prompt"],
    properties: {
      prompt: stringProperty("Complete image generation prompt."),
      save: objectSchema({
        properties: {
          name: stringProperty("Optional generated image filename."),
          description: stringProperty("Optional attachment description."),
        },
      }),
    },
  }),
  search_attachments: objectSchema({
    properties: {
      query: stringProperty(
        "Substring matched against attachment names, descriptions, and content types."
      ),
      mimeType: stringProperty(
        "Optional content type filter, for example image/png or image/."
      ),
      limit: numberProperty("Maximum attachments to return.", 1, 100),
    },
  }),
  read_attachment: objectSchema({
    required: ["attachmentId"],
    properties: {
      attachmentId: stringProperty("Attachment ID."),
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
