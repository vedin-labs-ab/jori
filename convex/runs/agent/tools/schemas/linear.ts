import {
  numberProperty,
  objectSchema,
  type SchemaMap,
  stringProperty,
} from "./fragments/common"

export const linearToolInputSchemas = {
  linear_search_issues: objectSchema({
    required: ["query"],
    properties: {
      first: numberProperty("Maximum issues to return.", 1, 25),
      query: stringProperty("Issue title text or Linear identifier."),
    },
  }),
  linear_get_issue: objectSchema({
    required: ["issueId"],
    properties: {
      issueId: stringProperty("Linear issue UUID or identifier."),
    },
  }),
  linear_list_comments: objectSchema({
    required: ["issueId"],
    properties: {
      first: numberProperty("Maximum comments to return.", 1, 50),
      issueId: stringProperty("Linear issue UUID or identifier."),
    },
  }),
  linear_add_comment: objectSchema({
    required: ["target", "body"],
    properties: {
      body: stringProperty("Markdown comment body."),
      target: {
        description:
          "Where to add the comment. Use issue for issue-level comments, or comment for a reply under an existing Linear comment.",
        oneOf: [
          objectSchema({
            required: ["type", "id"],
            properties: {
              id: stringProperty(
                "Linear issue UUID, often the value after linear:issue: in identifiers."
              ),
              type: { const: "issue", description: "Post on the issue." },
            },
          }),
          objectSchema({
            required: ["type", "id", "issueId"],
            properties: {
              id: stringProperty(
                "Linear parent comment UUID, often the value after linear:thread: in identifiers."
              ),
              issueId: stringProperty(
                "Linear issue UUID that contains the parent comment, often the value after linear:issue: in identifiers."
              ),
              type: {
                const: "comment",
                description: "Post as a reply under this comment.",
              },
            },
          }),
        ],
      },
    },
  }),
  linear_add_reaction: objectSchema({
    required: ["target", "emoji"],
    properties: {
      emoji: stringProperty("Emoji reaction value to send to Linear."),
      target: {
        description:
          "Where to add the reaction. Use comment for comments and subcomments, issue for issues, or projectUpdate for project updates.",
        oneOf: [
          objectSchema({
            required: ["type", "id"],
            properties: {
              id: stringProperty(
                "Linear comment or subcomment UUID. Use the value after linear:comment: for the message itself, or linear:thread: for the parent comment thread."
              ),
              type: {
                type: "string",
                enum: ["comment"],
                description: "React to a Linear comment or subcomment.",
              },
            },
          }),
          objectSchema({
            required: ["type", "id"],
            properties: {
              id: stringProperty(
                "Linear issue UUID, often the value after linear:issue: in identifiers."
              ),
              type: {
                type: "string",
                enum: ["issue"],
                description: "React to the Linear issue.",
              },
            },
          }),
          objectSchema({
            required: ["type", "id"],
            properties: {
              id: stringProperty("Linear project update UUID."),
              type: {
                type: "string",
                enum: ["projectUpdate"],
                description: "React to a Linear project update.",
              },
            },
          }),
        ],
      },
    },
  }),
} satisfies SchemaMap
