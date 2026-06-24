import { objectSchema, stringProperty } from "../common"

const nativeIconColors = [
  "gray",
  "lightgray",
  "brown",
  "yellow",
  "orange",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
]

export function notionIconProperty() {
  return {
    description: "Writable Notion page icon.",
    oneOf: [
      emojiIconSchema(),
      customEmojiIconSchema(),
      nativeIconSchema(),
      externalFileSchema("Externally hosted icon image."),
      fileUploadSchema("Notion file upload icon."),
    ],
  }
}

export function notionCoverProperty() {
  return {
    description: "Writable Notion page cover image.",
    oneOf: [
      externalFileSchema("Externally hosted cover image."),
      fileUploadSchema("Notion file upload cover image."),
    ],
  }
}

function emojiIconSchema() {
  return objectSchema({
    required: ["type", "emoji"],
    properties: {
      emoji: {
        ...stringProperty("A standard emoji character."),
        minLength: 1,
      },
      type: { type: "string", enum: ["emoji"] },
    },
  })
}

function customEmojiIconSchema() {
  return objectSchema({
    required: ["type", "custom_emoji"],
    properties: {
      custom_emoji: objectSchema({
        required: ["id"],
        properties: {
          id: stringProperty("Workspace custom emoji ID."),
        },
      }),
      type: { type: "string", enum: ["custom_emoji"] },
    },
  })
}

function nativeIconSchema() {
  return objectSchema({
    required: ["type", "icon"],
    properties: {
      icon: objectSchema({
        required: ["name"],
        properties: {
          color: {
            type: "string",
            enum: nativeIconColors,
            description: "Notion native icon color. Defaults to gray.",
          },
          name: stringProperty("Notion native icon name."),
        },
      }),
      type: { type: "string", enum: ["icon"] },
    },
  })
}

function externalFileSchema(description: string) {
  return {
    ...objectSchema({
      required: ["type", "external"],
      properties: {
        external: objectSchema({
          required: ["url"],
          properties: {
            url: {
              type: "string",
              description: "Public HTTPS URL.",
              format: "uri",
              pattern: "^https://\\S+$",
            },
          },
        }),
        type: { type: "string", enum: ["external"] },
      },
    }),
    description,
  }
}

function fileUploadSchema(description: string) {
  return {
    ...objectSchema({
      required: ["type", "file_upload"],
      properties: {
        file_upload: objectSchema({
          required: ["id"],
          properties: {
            id: stringProperty("Uploaded Notion file_upload ID."),
          },
        }),
        type: { type: "string", enum: ["file_upload"] },
      },
    }),
    description,
  }
}
