import {
  booleanField,
  constField,
  enumField,
  type JsonSchema,
  listField,
  nullableStringField,
  numberField,
  providerPayload,
  resultSchema,
  type SchemaMap,
  stringField,
} from "../common"
import { automationMiloToolResponseSchemas } from "./automations"
import { runMiloToolResponseSchemas } from "./runs"

function assetSummaryProperties() {
  return {
    assetId: stringField("Asset ID."),
    name: stringField("Asset filename."),
    mimeType: stringField("Asset content type."),
    size: numberField("Asset size in bytes."),
    createdAt: numberField("Creation time in epoch milliseconds."),
    url: nullableStringField("Temporary download URL, when available."),
    description: stringField("Asset description, when one was saved."),
  }
}

function skillMetadataSchema(): JsonSchema {
  return resultSchema({
    properties: {
      name: stringField("Skill name."),
      category: stringField("Skill category."),
      description: stringField("What the skill covers."),
      associatedIntegrations: listField("Integrations the skill leans on.", {
        type: "string",
      }),
    },
  })
}

function webToolResult(): JsonSchema {
  return resultSchema({
    required: ["provider", "results", "truncated"],
    properties: {
      provider: resultSchema({
        description: "Trace of the provider request.",
        properties: {
          name: constField("exa", "Search provider."),
          operation: enumField(["search", "contents"], "Provider operation."),
          requestId: stringField("Provider request ID."),
          resolvedSearchType: stringField("Search type the provider chose."),
          searchTimeMs: numberField("Provider-reported search time."),
          statuses: listField(
            "Per-URL crawl statuses for fetches.",
            providerPayload("id, source, and status.")
          ),
        },
      }),
      results: listField(
        "Normalized results.",
        resultSchema({
          required: [
            "url",
            "title",
            "source",
            "snippet",
            "highlights",
            "content",
          ],
          properties: {
            url: stringField("Result URL."),
            title: nullableStringField("Page title."),
            source: providerPayload(
              "Provider metadata: id, and author, faviconUrl, imageUrl, publishedAt, or score when known."
            ),
            snippet: nullableStringField("Best highlight or leading text."),
            highlights: listField("Query-relevant excerpts.", {
              type: "string",
            }),
            content: resultSchema({
              required: ["text", "characters", "truncated"],
              properties: {
                text: nullableStringField("Page text up to the character cap."),
                characters: numberField("Characters returned."),
                truncated: booleanField("True when the page had more text."),
              },
            }),
          },
        })
      ),
      truncated: booleanField("True when more results existed than returned."),
    },
  })
}

export const coreMiloToolResponseSchemas = {
  list_capabilities: resultSchema({
    required: ["run", "connected", "available"],
    description: "Tool availability grouped by integration surface.",
    properties: {
      run: listField(
        "Groups already granted to this run.",
        providerPayload("Capability group: surface plus its tools and modes.")
      ),
      connected: listField(
        "Groups connected for the tenant.",
        providerPayload("Capability group: surface plus its tools and modes.")
      ),
      available: listField(
        "Integrations that could be connected.",
        providerPayload("Capability group with status not_connected.")
      ),
    },
  }),
  load_skill: {
    description: "The skill's instructions, or the catalog when unknown.",
    oneOf: [
      resultSchema({
        required: ["status", "skill"],
        properties: {
          status: constField("loaded", "The skill was found."),
          skill: resultSchema({
            required: ["name", "instructions"],
            properties: {
              name: stringField("Skill name."),
              category: stringField("Skill category."),
              description: stringField("What the skill covers."),
              associatedIntegrations: listField(
                "Integrations the skill leans on.",
                { type: "string" }
              ),
              instructions: stringField("Full skill instructions."),
            },
          }),
        },
      }),
      resultSchema({
        required: ["status", "name", "availableSkills"],
        properties: {
          status: constField("not_found", "No skill matched the name."),
          name: nullableStringField("The requested name."),
          availableSkills: listField(
            "Every available skill.",
            skillMetadataSchema()
          ),
        },
      }),
    ],
  },
  ...runMiloToolResponseSchemas,
  offer_integration: providerPayload(
    "Offer outcome: status (connected when already available, otherwise the delivered offer's status) with integration, message, and offer identifiers."
  ),
  cancel_approval_request: resultSchema({
    required: ["status", "message"],
    properties: {
      status: enumField(
        [
          "cancelled",
          "invalid_message",
          "missing",
          "decided",
          "expired",
          "failed",
        ],
        "What happened to the pending approval."
      ),
      message: stringField("Human-readable outcome."),
    },
  }),
  cancel_integration_offer: resultSchema({
    required: ["status", "message"],
    properties: {
      status: enumField(
        ["cancelled", "missing", "already_resolved"],
        "What happened to the pending offer."
      ),
      message: stringField("Human-readable outcome."),
    },
  }),
  save_asset: resultSchema({
    required: ["assetId", "mimeType", "name", "size", "url"],
    properties: {
      assetId: stringField("Asset ID for tools that send assets."),
      mimeType: stringField("Stored content type."),
      name: stringField("Stored filename."),
      size: numberField("Asset size in bytes."),
      url: nullableStringField("Temporary download URL, when available."),
    },
  }),
  generate_image: resultSchema({
    required: ["image", "provider", "status"],
    properties: {
      image: resultSchema({
        description: "The saved image asset.",
        properties: {
          assetId: stringField("Asset ID for tools that send assets."),
          mimeType: stringField("Image content type."),
          name: stringField("Image filename."),
          size: numberField("Image size in bytes."),
          url: nullableStringField("Temporary download URL, when available."),
          model: stringField("Image model that generated it."),
          path: stringField("Workspace-relative sandbox path."),
        },
      }),
      provider: resultSchema({
        properties: {
          name: constField("openrouter", "Image provider."),
          requestId: stringField("Provider request ID."),
        },
      }),
      status: constField("ok", "Generation succeeded."),
    },
  }),
  search_assets: listField(
    "Matching run assets, newest first.",
    resultSchema({ properties: assetSummaryProperties() })
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

export { automationMiloToolResponseSchemas }
