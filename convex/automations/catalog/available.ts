import { event, optionParameter, provider, textParameter } from "./builders"

export const availableAutomationEventCatalog = [
  provider("slack", [
    event("message.created", {
      label: "Channel message created",
      description: "Runs when a new message appears in a selected channel.",
      parameters: [
        optionParameter("channel", "Channel", "Search Slack channels", {
          required: true,
          source: "slack.channels",
        }),
      ],
    }),
  ]),
  provider("github", [
    event("issue.comment.changed", {
      label: "Issue comment created/edited",
      description:
        "Runs when a comment is created or edited on a selected GitHub issue.",
      parameters: [
        optionParameter("repo", "Repository", "Search repositories", {
          required: true,
          source: "github.repositories",
        }),
        optionParameter("issue", "Issue", "Search issues", {
          source: "github.issues",
          dependsOn: ["repo"],
        }),
      ],
    }),
    event("pull_request.comment.changed", {
      label: "PR comment created/edited",
      description:
        "Runs when a conversation comment is created or edited on a selected GitHub pull request.",
      parameters: [
        optionParameter("repo", "Repository", "Search repositories", {
          required: true,
          source: "github.repositories",
        }),
        optionParameter("pr", "Pull request", "Search pull requests", {
          source: "github.pullRequests",
          dependsOn: ["repo"],
        }),
      ],
    }),
    event("pull_request.review_comment.changed", {
      label: "PR review comment created/edited",
      description:
        "Runs when an inline review comment is created or edited on a selected GitHub pull request.",
      parameters: [
        optionParameter("repo", "Repository", "Search repositories", {
          required: true,
          source: "github.repositories",
        }),
        optionParameter("pr", "Pull request", "Search pull requests", {
          source: "github.pullRequests",
          dependsOn: ["repo"],
        }),
        textParameter("path", "Path", "src/example.ts"),
      ],
    }),
  ]),
  provider("linear", [
    event("issue.comment.changed", {
      label: "Issue comment created/updated",
      description:
        "Runs when a comment is created or updated on a matching Linear issue.",
      parameters: [
        optionParameter("team", "Team", "Search Linear teams", {
          source: "linear.teams",
        }),
        optionParameter("project", "Project", "Search Linear projects", {
          source: "linear.projects",
        }),
        optionParameter("issue", "Issue", "Search Linear issues", {
          source: "linear.issues",
        }),
      ],
    }),
  ]),
]
