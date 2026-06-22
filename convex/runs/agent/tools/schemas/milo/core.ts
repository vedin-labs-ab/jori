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
  offer_integration_setup: objectSchema({
    required: ["integration"],
    properties: {
      integration: {
        type: "string",
        description: "Integration the user wants to connect.",
        enum: integrationEnum,
      },
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
