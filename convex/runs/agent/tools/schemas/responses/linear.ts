import {
  type JsonSchema,
  listField,
  providerPayload,
  resultSchema,
  type SchemaMap,
  stringField,
} from "./common"

// Linear results come back from Milo-authored GraphQL selections, so the
// node shapes are known; mutations return the raw GraphQL envelope.

function issueNode(description: string): JsonSchema {
  return {
    type: "object",
    additionalProperties: true,
    description,
    properties: {
      id: stringField("Linear issue UUID."),
      identifier: stringField("Human identifier, for example ENG-42."),
      title: stringField("Issue title."),
      url: stringField("Issue page URL."),
      updatedAt: stringField("Last update timestamp."),
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
      id: stringField("Linear comment UUID."),
      body: stringField("Markdown comment body."),
      createdAt: stringField("Creation timestamp."),
      updatedAt: stringField("Last update timestamp."),
      url: stringField("Comment page URL."),
      parent: providerPayload("Parent comment id for replies, or null."),
      user: providerPayload("Comment author with id and name."),
    },
  }
}

export const linearToolResponseSchemas = {
  linear_search_issues: resultSchema({
    required: ["query", "issues"],
    properties: {
      query: stringField("The normalized query that ran."),
      issues: listField(
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
  linear_list_comments: listField(
    "Comments on the issue, as Milo's GraphQL selection returns them.",
    commentNode()
  ),
  linear_add_comment: providerPayload(
    "Linear's GraphQL envelope: data.commentCreate with success and the created comment (id, body, url, parent, issue)."
  ),
  linear_add_reaction: providerPayload(
    "Linear's GraphQL envelope: data.reactionCreate with success and the created reaction (id, emoji, user)."
  ),
} satisfies SchemaMap
