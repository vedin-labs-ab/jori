import {
  type JsonSchema,
  numberProperty,
  objectSchema,
  stringProperty,
} from "../common"

export function shareLinkSchema(): JsonSchema {
  return objectSchema({
    required: ["url", "urlPath", "expiresAt"],
    properties: {
      url: stringProperty("View-only share link."),
      urlPath: stringProperty(
        "Console path with the share secret in its fragment."
      ),
      expiresAt: numberProperty("Expiry time in epoch milliseconds."),
    },
  })
}

export function visibilitySchema(): JsonSchema {
  return {
    description: "Who may see this resource inside its organization.",
    oneOf: [
      objectSchema({
        required: ["mode"],
        properties: { mode: { enum: ["private", "organization"] } },
      }),
      grantSchema("people", "personIds"),
      grantSchema("teams", "teamIds"),
    ],
  }
}

function grantSchema(mode: string, field: string) {
  return objectSchema({
    required: ["mode", field],
    properties: {
      mode: { const: mode },
      [field]: {
        type: "array",
        items: stringProperty("Granted person or team ID."),
      },
    },
  })
}
