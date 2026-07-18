import {
  constField,
  enumField,
  type JsonSchema,
  listField,
  numberField,
  providerPayload,
  resultSchema,
  type SchemaMap,
  stringField,
} from "../common"

// Broker-scoped tools: capability discovery, integration offers, and the
// cancel flows that only interactive runs can use.

function capabilityGroupSchema(
  extra: Record<string, unknown> = {}
): JsonSchema {
  return resultSchema({
    required: ["surface", "label", "tools"],
    properties: {
      surface: stringField("Integration surface key."),
      label: stringField("Display name of the surface."),
      tools: listField(
        "Tools the surface offers.",
        resultSchema({
          required: ["tool", "label", "access", "mode"],
          properties: {
            tool: stringField("Exact tool name."),
            label: stringField("Display name."),
            description: stringField("What the tool does."),
            access: enumField(["read", "write"], "Access level."),
            mode: stringField("Permission mode for this run."),
          },
        })
      ),
      ...extra,
    },
  })
}

export const brokerMiloToolResponseSchemas = {
  list_capabilities: resultSchema({
    required: ["run", "connected", "available"],
    description: "Tool availability grouped by integration surface.",
    properties: {
      run: listField(
        "Groups already granted to this run.",
        capabilityGroupSchema()
      ),
      connected: listField(
        "Groups connected for the tenant.",
        capabilityGroupSchema()
      ),
      available: listField(
        "Integrations that could be connected.",
        capabilityGroupSchema({
          status: constField("not_connected", "Not yet connected."),
        })
      ),
    },
  }),
  offer_integration: {
    description:
      "Already-connected integrations short-circuit; otherwise the pending offer with its connect link.",
    oneOf: [
      resultSchema({
        required: ["status", "integration", "integrationId", "message"],
        properties: {
          status: constField("connected", "Already connected and available."),
          integration: stringField("Integration key."),
          integrationId: stringField("Connected integration ID."),
          message: stringField("Human-readable outcome."),
        },
      }),
      resultSchema({
        required: [
          "status",
          "integration",
          "integrationOfferId",
          "urlPath",
          "expiresAt",
          "message",
        ],
        properties: {
          status: enumField(
            ["created", "delivered"],
            "delivered when the offer was posted on the requester surface."
          ),
          integration: stringField("Integration key."),
          integrationOfferId: stringField(
            "Offer ID for cancel_integration_offer."
          ),
          url: stringField(
            "Absolute connect link, when the host is configured."
          ),
          urlPath: stringField("Console path for the connect link."),
          expiresAt: numberField("Offer expiry in epoch milliseconds."),
          message: stringField("Human-readable outcome."),
          delivery: providerPayload("Delivery details for the surface."),
        },
      }),
    ],
  },
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
} satisfies SchemaMap
