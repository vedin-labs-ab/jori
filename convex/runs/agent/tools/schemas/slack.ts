import {
  numberProperty,
  objectSchema,
  runAssetsProperty,
  type SchemaMap,
  stringProperty,
} from "./common"

export const slackToolInputSchemas = {
  channels_list: objectSchema({
    properties: {
      cursor: stringProperty("Slack pagination cursor."),
      limit: numberProperty("Maximum channels to return.", 1, 1000),
      types: stringProperty(
        "Comma-separated Slack conversation types, for example public_channel,private_channel,im,mpim."
      ),
    },
  }),
  conversations_history: objectSchema({
    required: ["channel"],
    properties: {
      channel: stringProperty("Slack conversation ID."),
      inclusive: { type: "boolean" },
      latest: stringProperty("Latest Slack timestamp to include."),
      limit: numberProperty("Maximum messages to return.", 1, 100),
      oldest: stringProperty("Oldest Slack timestamp to include."),
    },
  }),
  conversations_replies: objectSchema({
    required: ["channel", "ts"],
    properties: {
      channel: stringProperty("Slack conversation ID."),
      limit: numberProperty("Maximum replies to return.", 1, 100),
      ts: stringProperty("Parent message timestamp."),
    },
  }),
  conversations_search_messages: objectSchema({
    required: ["query"],
    properties: {
      count: numberProperty("Maximum search results to return.", 1, 100),
      page: numberProperty("Slack search result page.", 1, 100),
      query: stringProperty("Slack search query."),
    },
  }),
  users_search: objectSchema({
    properties: {
      cursor: stringProperty("Slack pagination cursor."),
      limit: numberProperty(
        "Users fetched per page, before the query filter is applied.",
        1,
        200
      ),
      query: stringProperty("Optional case-insensitive text to match."),
    },
  }),
  conversations_add_message: objectSchema({
    required: ["channel", "text"],
    properties: {
      assets: runAssetsProperty(),
      blocks: {
        type: "array",
        description:
          "Optional Block Kit blocks for text-only messages. When assets are provided, text is used as the file upload comment.",
        items: { type: "object", additionalProperties: true },
      },
      channel: stringProperty("Slack conversation or user ID."),
      text: stringProperty("Slack mrkdwn message text."),
      thread_ts: stringProperty("Thread timestamp for a threaded reply."),
    },
  }),
  slack_add_reaction: objectSchema({
    required: ["channel", "name", "timestamp"],
    properties: {
      channel: stringProperty("Slack channel ID."),
      name: stringProperty(
        "Emoji reaction name without surrounding colons, for example thumbsup or white_check_mark."
      ),
      timestamp: stringProperty("Slack message timestamp to react to."),
    },
  }),
} satisfies SchemaMap
