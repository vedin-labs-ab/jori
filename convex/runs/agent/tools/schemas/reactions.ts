import { numberProperty, objectSchema } from "./common"

export function githubReactionContentProperty(description: string) {
  return {
    type: "string",
    enum: [
      "+1",
      "-1",
      "laugh",
      "confused",
      "heart",
      "hooray",
      "rocket",
      "eyes",
    ],
    description,
  }
}

export function githubCommentReactionSubjectProperty() {
  return {
    type: "string",
    enum: ["issue_comment", "pull_request_review_comment"],
    description: "Comment type to react to.",
  }
}

export function githubReactionTargetProperty() {
  return {
    description: "GitHub issue, pull request, or comment to react to.",
    oneOf: [
      objectSchema({
        required: ["type", "issueNumber"],
        properties: {
          issueNumber: numberProperty(
            "Issue or pull request number to react to.",
            1
          ),
          type: {
            type: "string",
            enum: ["issue"],
            description: "React to an issue or pull request.",
          },
        },
      }),
      objectSchema({
        required: ["type", "commentId"],
        properties: {
          commentId: numberProperty(
            "Issue comment ID, including pull request conversation comments.",
            1
          ),
          type: {
            type: "string",
            enum: ["issue_comment"],
            description:
              "React to an issue comment or pull request conversation comment.",
          },
        },
      }),
      objectSchema({
        required: ["type", "commentId"],
        properties: {
          commentId: numberProperty("Pull request review comment ID.", 1),
          type: {
            type: "string",
            enum: ["pull_request_review_comment"],
            description: "React to an inline pull request review comment.",
          },
        },
      }),
    ],
  }
}
