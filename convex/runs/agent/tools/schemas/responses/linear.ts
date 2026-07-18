import {
  arrayProperty,
  type JsonSchema,
  objectSchema,
  providerPayload,
  type SchemaMap,
  stringProperty,
} from "./common"

// Linear results come back from Milo-authored GraphQL selections, so the
// node shapes are known; mutations return the raw GraphQL envelope.

function issueNode(description: string): JsonSchema {
  return {
    type: "object",
    additionalProperties: true,
    description,
    properties: {
      id: stringProperty("Linear issue UUID."),
      identifier: stringProperty("Human identifier, for example ENG-42."),
      title: stringProperty("Issue title."),
      url: stringProperty("Issue page URL."),
      updatedAt: stringProperty("Last update timestamp."),
      state: providerPayload("Workflow state with name and type."),
      assignee: providerPayload("Assignee with id and name, or null."),
      creator: providerPayload("Creator with id and name, or null."),
    },
  }
}

function commentNode(): JsonSchema {
  return {
    type: "object",
    additionalProperties: true,
    description: "Comment node from Milo's GraphQL selection.",
    properties: {
      id: stringProperty("Linear comment UUID."),
      body: stringProperty("Markdown comment body."),
      createdAt: stringProperty("Creation timestamp."),
      updatedAt: stringProperty("Last update timestamp."),
      url: stringProperty("Comment page URL."),
      parent: providerPayload("Parent comment id for replies, or null."),
      user: providerPayload("Comment author with id and name."),
    },
  }
}

export const linearToolResponseSchemas = {
  linear_search_issues: objectSchema({
    required: ["query", "issues"],
    properties: {
      query: stringProperty("The normalized query that ran."),
      issues: arrayProperty(
        "Matching issues; an exact identifier match is included first.",
        issueNode("Issue summary node.")
      ),
    },
  }),
  linear_get_issue: {
    ...issueNode(
      "The issue with description, timestamps, and its first 25 comments in comments.nodes; null when not found."
    ),
    type: ["object", "null"],
  },
  linear_list_comments: arrayProperty(
    "Comments on the issue, as Milo's GraphQL selection returns them.",
    commentNode()
  ),
  linear_add_comment: objectSchema({
    required: ["success", "comment"],
    properties: {
      success: { type: "boolean", description: "Whether Linear accepted it." },
      comment: {
        ...providerPayload(
          "The created comment: id, body, url, parent, and issue (id, identifier); null when creation failed."
        ),
        type: ["object", "null"],
      },
    },
  }),
  linear_add_reaction: objectSchema({
    required: ["success", "reaction"],
    properties: {
      success: { type: "boolean", description: "Whether Linear accepted it." },
      reaction: {
        ...providerPayload(
          "The created reaction: id, emoji, and user; null when creation failed."
        ),
        type: ["object", "null"],
      },
    },
  }),
} satisfies SchemaMap
