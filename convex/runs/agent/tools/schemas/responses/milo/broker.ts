import {
  arrayProperty,
  constProperty,
  enumProperty,
  type JsonSchema,
  numberProperty,
  objectSchema,
  providerPayload,
  type SchemaMap,
  stringProperty,
} from "../common"

// Broker-scoped tools: capability discovery, integration offers, and the
// cancel flows that only interactive runs can use.

function capabilityGroupSchema(
  extra: Record<string, unknown> = {}
): JsonSchema {
  return objectSchema({
    required: ["surface", "label", "tools"],
    properties: {
      surface: stringProperty("Integration surface key."),
      label: stringProperty("Display name of the surface."),
      tools: arrayProperty(
        "Tools the surface offers.",
        objectSchema({
          required: ["tool", "label", "access", "mode"],
          properties: {
            tool: stringProperty("Exact tool name."),
            label: stringProperty("Display name."),
            description: stringProperty("What the tool does."),
            access: enumProperty(["read", "write"], "Access level."),
            mode: stringProperty("Permission mode for this run."),
          },
        })
      ),
      ...extra,
    },
  })
}

export const brokerMiloToolResponseSchemas = {
  list_capabilities: objectSchema({
    required: ["run", "connected", "available"],
    description: "Tool availability grouped by integration surface.",
    properties: {
      run: arrayProperty(
        "Groups already granted to this run.",
        capabilityGroupSchema()
      ),
      connected: arrayProperty(
        "Groups connected for the tenant.",
        capabilityGroupSchema()
      ),
      available: arrayProperty(
        "Integrations that could be connected.",
        capabilityGroupSchema({
          status: constProperty("not_connected", "Not yet connected."),
        })
      ),
    },
  }),
  offer_integration: {
    description:
      "Already-connected integrations short-circuit; otherwise the pending offer with its connect link.",
    oneOf: [
      objectSchema({
        required: ["status", "integration", "integrationId", "message"],
        properties: {
          status: constProperty(
            "connected",
            "Already connected and available."
          ),
          integration: stringProperty("Integration key."),
          integrationId: stringProperty("Connected integration ID."),
          message: stringProperty("Human-readable outcome."),
        },
      }),
      objectSchema({
        required: [
          "status",
          "integration",
          "integrationOfferId",
          "urlPath",
          "expiresAt",
          "message",
        ],
        properties: {
          status: enumProperty(
            ["created", "delivered"],
            "delivered when the offer was posted on the requester surface."
          ),
          integration: stringProperty("Integration key."),
          integrationOfferId: stringProperty(
            "Offer ID for cancel_integration_offer."
          ),
          url: stringProperty(
            "Absolute connect link, when the host is configured."
          ),
          urlPath: stringProperty("Console path for the connect link."),
          expiresAt: numberProperty("Offer expiry in epoch milliseconds."),
          message: stringProperty("Human-readable outcome."),
          delivery: providerPayload("Delivery details for the surface."),
        },
      }),
    ],
  },
  cancel_approval_request: objectSchema({
    required: ["status", "message"],
    properties: {
      status: enumProperty(
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
      message: stringProperty("Human-readable outcome."),
    },
  }),
  cancel_integration_offer: objectSchema({
    required: ["status", "message"],
    properties: {
      status: enumProperty(
        ["cancelled", "missing", "already_resolved"],
        "What happened to the pending offer."
      ),
      message: stringProperty("Human-readable outcome."),
    },
  }),
} satisfies SchemaMap
