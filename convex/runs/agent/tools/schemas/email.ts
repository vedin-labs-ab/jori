import {
  filesProperty,
  objectSchema,
  stringArrayProperty,
  stringProperty,
} from "./fragments/common"

// One email message shape for every mail provider; the schema copy is
// user-facing, so keep it identical across Gmail and Microsoft tools.
export function emailMessageSchema(properties: Record<string, unknown> = {}) {
  return objectSchema({
    required: ["to", "subject", "body"],
    properties: {
      files: filesProperty(),
      bcc: stringArrayProperty("BCC recipient email addresses."),
      body: stringProperty("Message body."),
      bodyType: {
        type: "string",
        enum: ["Text", "HTML"],
        description: "Defaults to Text.",
      },
      cc: stringArrayProperty("CC recipient email addresses."),
      subject: stringProperty("Message subject."),
      to: stringArrayProperty("Recipient email addresses."),
      ...properties,
    },
  })
}
