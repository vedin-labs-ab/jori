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
