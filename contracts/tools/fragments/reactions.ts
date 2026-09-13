import { enumProperty } from "./common"

export const githubReactionContents: readonly string[] = [
  "+1",
  "-1",
  "laugh",
  "confused",
  "heart",
  "hooray",
  "rocket",
  "eyes",
]

export function isGitHubReactionContent(value: unknown): value is string {
  return typeof value === "string" && githubReactionContents.includes(value)
}

export function githubReactionContentProperty(description: string) {
  return enumProperty(githubReactionContents, description)
}

export function githubCommentReactionSubjectProperty() {
  return {
    type: "string",
    enum: ["issue_comment", "pull_request_review_comment"],
    description: "Comment type to react to.",
  }
}
