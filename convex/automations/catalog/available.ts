import {
  issueCommentEvent,
  pullRequestCommentEvent,
  pullRequestReviewCommentEvent,
} from "../names"
import { event, optionParameter, provider, textParameter } from "./builders"
import { type AutomationEventParameter } from "./types"

const githubIssueCommentParameters = [
  optionParameter("repo", "Repository", "Search repositories", {
    required: true,
    source: "github.repositories",
  }),
  optionParameter("issue", "Issue", "Search issues", {
    source: "github.issues",
    dependsOn: ["repo"],
    description: "Narrows runs to comments on the selected issue.",
  }),
]

const githubPullRequestCommentParameters = [
  optionParameter("repo", "Repository", "Search repositories", {
    required: true,
    source: "github.repositories",
  }),
  optionParameter("pr", "Pull request", "Search pull requests", {
    source: "github.pullRequests",
    dependsOn: ["repo"],
    description: "Narrows runs to comments on the selected pull request.",
  }),
]

const githubPullRequestReviewCommentParameters = [
  ...githubPullRequestCommentParameters,
  textParameter("path", "Path", "src/example.ts", {
    resetsOn: ["repo", "pr"],
    description: "Narrows runs to comments on one file path.",
  }),
]

const linearIssueCommentParameters = [
  optionParameter("team", "Team", "Search Linear teams", {
    source: "linear.teams",
    description: "Narrows runs to issues in the selected team.",
  }),
  optionParameter("project", "Project", "Search Linear projects", {
    source: "linear.projects",
    resetsOn: ["team"],
    description: "Narrows runs to issues in the selected project.",
  }),
  optionParameter("issue", "Issue", "Search Linear issues", {
    source: "linear.issues",
    resetsOn: ["team", "project"],
    description: "Narrows runs to comments on the selected issue.",
  }),
]

function commentEvents(args: {
  values: {
    created: string
    edited: string
  }
  label: string
  target: string
  parameters: readonly AutomationEventParameter[]
}) {
  return [
    event(args.values.created, {
      label: `${args.label} created`,
      description: `Runs when someone creates ${args.target}.`,
      parameters: args.parameters,
    }),
    event(args.values.edited, {
      label: `${args.label} edited`,
      description: `Runs when someone edits ${args.target}.`,
      parameters: args.parameters,
    }),
  ]
}

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
    ...commentEvents({
      values: issueCommentEvent,
      label: "Issue comment",
      target: "a comment on the selected GitHub issue",
      parameters: githubIssueCommentParameters,
    }),
    ...commentEvents({
      values: pullRequestCommentEvent,
      label: "Pull request comment",
      target: "a conversation comment on the selected GitHub pull request",
      parameters: githubPullRequestCommentParameters,
    }),
    ...commentEvents({
      values: pullRequestReviewCommentEvent,
      label: "Pull request review comment",
      target: "an inline review comment on the selected GitHub pull request",
      parameters: githubPullRequestReviewCommentParameters,
    }),
  ]),
  provider("linear", [
    ...commentEvents({
      values: issueCommentEvent,
      label: "Issue comment",
      target: "a comment on a matching Linear issue",
      parameters: linearIssueCommentParameters,
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
