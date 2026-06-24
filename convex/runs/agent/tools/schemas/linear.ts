import {
  numberProperty,
  objectSchema,
  type SchemaMap,
  stringProperty,
} from "./common"

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
    required: ["issueId", "body"],
    properties: {
      body: stringProperty("Markdown comment body."),
      issueId: stringProperty("Linear issue UUID."),
    },
  }),
  linear_add_reaction: objectSchema({
    required: ["emoji"],
    properties: {
      commentId: stringProperty("Linear comment UUID to react to."),
      emoji: stringProperty("Emoji reaction value to send to Linear."),
      issueId: stringProperty("Linear issue UUID to react to."),
      projectUpdateId: stringProperty(
        "Linear project update UUID to react to."
      ),
    },
  }),
} satisfies SchemaMap
