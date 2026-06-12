import { event, optionParameter, provider, textParameter } from "./builders"

export const availableAutomationEventCatalog = [
  provider("slack", [
    event("message.created", {
      label: "New channel message",
      description:
        "Runs when a new message appears in the selected Slack channel.",
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
      label: "Issue comment created or edited",
      description:
        "Runs when someone creates or edits a comment on the selected GitHub issue.",
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
      label: "Pull request comment created or edited",
      description:
        "Runs when someone creates or edits a conversation comment on the selected GitHub pull request.",
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
      label: "Pull request review comment created or edited",
      description:
        "Runs when someone creates or edits an inline review comment on the selected GitHub pull request.",
      parameters: [
        optionParameter("repo", "Repository", "Search repositories", {
          required: true,
          source: "github.repositories",
        }),
        optionParameter("pr", "Pull request", "Search pull requests", {
          source: "github.pullRequests",
          dependsOn: ["repo"],
        }),
        textParameter("path", "Path", "src/example.ts", {
          resetsOn: ["repo", "pr"],
        }),
      ],
    }),
  ]),
  provider("linear", [
    event("issue.comment.changed", {
      label: "Issue comment created or updated",
      description:
        "Runs when someone creates or updates a comment on a matching Linear issue.",
      parameters: [
        optionParameter("team", "Team", "Search Linear teams", {
          source: "linear.teams",
        }),
        optionParameter("project", "Project", "Search Linear projects", {
          source: "linear.projects",
          resetsOn: ["team"],
        }),
        optionParameter("issue", "Issue", "Search Linear issues", {
          source: "linear.issues",
          resetsOn: ["team", "project"],
        }),
      ],
    }),
  ]),
  provider("notion", [
    event("page.updated", {
      label: "Page updated",
      description:
        "Runs when content or properties change on the selected Notion page.",
      parameters: [
        optionParameter("page", "Page", "Search Notion pages", {
          required: true,
          source: "notion.pages",
        }),
      ],
    }),
    event("data_source.item.changed", {
      label: "Data source item created or updated",
      description:
        "Runs when a page is created or updated inside the selected Notion data source.",
      parameters: [
        optionParameter("dataSource", "Data source", "Search data sources", {
          required: true,
          source: "notion.dataSources",
        }),
      ],
    }),
    event("comment.created", {
      label: "Comment created",
      description:
        "Runs when a comment is created on the selected Notion page.",
      parameters: [
        optionParameter("page", "Page", "Search Notion pages", {
          required: true,
          source: "notion.pages",
        }),
      ],
    }),
  ]),
]
