import {
  arrayProperty,
  booleanProperty,
  constProperty,
  enumProperty,
  type JsonSchema,
  nullableStringProperty,
  numberProperty,
  objectSchema,
  providerPayload,
  type SchemaMap,
  stringProperty,
} from "../common"
import { automationJoriToolResponseSchemas } from "./automations"
import { brokerJoriToolResponseSchemas } from "./broker"
import { runJoriToolResponseSchemas } from "./runs"

function assetSummaryProperties() {
  return {
    assetId: stringProperty("Asset ID."),
    name: stringProperty("Asset filename."),
    mimeType: stringProperty("Asset content type."),
    size: numberProperty("Asset size in bytes."),
    createdAt: numberProperty("Creation time in epoch milliseconds."),
    url: nullableStringProperty("Temporary download URL, when available."),
    description: stringProperty("Asset description, when one was saved."),
  }
}

function skillMetadataSchema(): JsonSchema {
  return objectSchema({
    properties: {
      name: stringProperty("Skill name."),
      category: stringProperty("Skill category."),
      description: stringProperty("What the skill covers."),
      associatedIntegrations: arrayProperty(
        "Integrations the skill leans on.",
        {
          type: "string",
        }
      ),
    },
  })
}

function webToolResult(): JsonSchema {
  return objectSchema({
    required: ["provider", "results", "truncated"],
    properties: {
      provider: objectSchema({
        description: "Trace of the provider request.",
        properties: {
          name: constProperty("exa", "Search provider."),
          operation: enumProperty(
            ["search", "contents"],
            "Provider operation."
          ),
          requestId: stringProperty("Provider request ID."),
          resolvedSearchType: stringProperty("Search type the provider chose."),
          searchTimeMs: numberProperty("Provider-reported search time."),
          statuses: arrayProperty(
            "Per-URL crawl statuses for fetches.",
            providerPayload("id, source, and status.")
          ),
        },
      }),
      results: arrayProperty(
        "Normalized results.",
        objectSchema({
          required: [
            "url",
            "title",
            "source",
            "snippet",
            "highlights",
            "content",
          ],
          properties: {
            url: stringProperty("Result URL."),
            title: nullableStringProperty("Page title."),
            source: providerPayload(
              "Provider metadata: id, and author, faviconUrl, imageUrl, publishedAt, or score when known."
            ),
            snippet: nullableStringProperty("Best highlight or leading text."),
            highlights: arrayProperty("Query-relevant excerpts.", {
              type: "string",
            }),
            content: objectSchema({
              required: ["text", "characters", "truncated"],
              properties: {
                text: nullableStringProperty(
                  "Page text up to the character cap."
                ),
                characters: numberProperty("Characters returned."),
                truncated: booleanProperty("True when the page had more text."),
              },
            }),
          },
        })
      ),
      truncated: booleanProperty(
        "True when more results existed than returned."
      ),
    },
  })
}

export const coreJoriToolResponseSchemas = {
  ...brokerJoriToolResponseSchemas,
  load_skill: {
    description: "The skill's instructions, or the catalog when unknown.",
    oneOf: [
      objectSchema({
        required: ["status", "skill"],
        properties: {
          status: constProperty("loaded", "The skill was found."),
          skill: objectSchema({
            required: ["name", "instructions"],
            properties: {
              name: stringProperty("Skill name."),
              category: stringProperty("Skill category."),
              description: stringProperty("What the skill covers."),
              associatedIntegrations: arrayProperty(
                "Integrations the skill leans on.",
                { type: "string" }
              ),
              instructions: stringProperty("Full skill instructions."),
            },
          }),
        },
      }),
      objectSchema({
        required: ["status", "name", "availableSkills"],
        properties: {
          status: constProperty("not_found", "No skill matched the name."),
          name: nullableStringProperty("The requested name."),
          availableSkills: arrayProperty(
            "Every available skill.",
            skillMetadataSchema()
          ),
        },
      }),
    ],
  },
  ...runJoriToolResponseSchemas,
  save_asset: objectSchema({
    required: ["assetId", "mimeType", "name", "size", "url"],
    properties: {
      assetId: stringProperty("Asset ID for tools that send assets."),
      mimeType: stringProperty("Stored content type."),
      name: stringProperty("Stored filename."),
      size: numberProperty("Asset size in bytes."),
      url: nullableStringProperty("Temporary download URL, when available."),
    },
  }),
  generate_image: objectSchema({
    required: ["image", "provider", "status"],
    properties: {
      image: objectSchema({
        description: "The saved image asset.",
        properties: {
          assetId: stringProperty("Asset ID for tools that send assets."),
          mimeType: stringProperty("Image content type."),
          name: stringProperty("Image filename."),
          size: numberProperty("Image size in bytes."),
          url: nullableStringProperty(
            "Temporary download URL, when available."
          ),
          model: stringProperty("Image model that generated it."),
          path: stringProperty("Workspace-relative sandbox path."),
        },
      }),
      provider: objectSchema({
        properties: {
          name: constProperty("openrouter", "Image provider."),
          requestId: stringProperty("Provider request ID."),
        },
      }),
      status: constProperty("ok", "Generation succeeded."),
    },
  }),
  search_assets: arrayProperty(
    "Matching run assets, newest first.",
    objectSchema({ properties: assetSummaryProperties() })
  ),
  read_asset: {
    type: ["object", "null"],
    additionalProperties: false,
    description: "The asset summary; null when not found.",
    properties: assetSummaryProperties(),
  },
  web_search: webToolResult(),
  web_fetch: webToolResult(),
} satisfies SchemaMap

export { automationJoriToolResponseSchemas }
