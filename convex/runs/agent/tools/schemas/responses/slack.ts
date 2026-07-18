import {
  arrayProperty,
  booleanProperty,
  constProperty,
  enumProperty,
  type JsonSchema,
  numberProperty,
  objectSchema,
  type SchemaMap,
  stringProperty,
} from "./common"

// Slack results are normalized at the broker edge; identifiers keep Slack's
// values so they thread straight back into follow-up calls.

function slackMessageProperties() {
  return {
    ts: stringProperty("Message timestamp; identifies the message."),
    threadTs: stringProperty("Parent timestamp for threaded messages."),
    userId: stringProperty("Author user ID."),
    botId: stringProperty("Author bot ID for bot messages."),
    subtype: stringProperty("Slack message subtype, when not a plain message."),
    text: stringProperty("Message text in Slack mrkdwn."),
    blocks: arrayProperty("Block Kit content, when the message carries it.", {
      type: "object",
      additionalProperties: true,
    }),
    reactions: arrayProperty(
      "Reactions on the message.",
      objectSchema({
        properties: {
          name: stringProperty("Emoji name."),
          count: numberProperty("How many members reacted."),
        },
      })
    ),
    replyCount: numberProperty("Thread reply count, on thread parents."),
    edited: booleanProperty("True when the message was edited."),
  }
}

function slackMessageSchema(): JsonSchema {
  return objectSchema({
    description: "Normalized Slack message.",
    required: ["ts", "text"],
    properties: slackMessageProperties(),
  })
}

function messageListing(description: string): JsonSchema {
  return objectSchema({
    required: ["messages", "hasMore"],
    properties: {
      messages: arrayProperty(description, slackMessageSchema()),
      hasMore: booleanProperty("True when more messages exist in the range."),
    },
  })
}

export const slackToolResponseSchemas = {
  channels_list: objectSchema({
    required: ["channels"],
    properties: {
      channels: arrayProperty(
        "Conversations of the requested types.",
        objectSchema({
          required: ["channelId", "type"],
          properties: {
            channelId: stringProperty("Conversation ID for other Slack calls."),
            name: stringProperty("Channel name; absent for direct messages."),
            type: enumProperty(
              ["public_channel", "private_channel", "im", "mpim"],
              "Conversation type."
            ),
            topic: stringProperty("Channel topic, when set."),
            memberCount: numberProperty("Member count, when Slack reports it."),
            archived: booleanProperty("True for archived channels."),
            userId: stringProperty("Counterpart user ID for direct messages."),
          },
        })
      ),
      nextCursor: stringProperty(
        "Pass as cursor to continue; absent on the last page."
      ),
    },
  }),
  conversations_history: messageListing("Messages, newest first."),
  conversations_replies: messageListing("The thread, parent message first."),
  conversations_search_messages: objectSchema({
    required: ["matches", "totalCount"],
    properties: {
      matches: arrayProperty(
        "Matching messages with their source conversation.",
        objectSchema({
          required: ["ts", "text"],
          properties: {
            ...slackMessageProperties(),
            channelId: stringProperty("Conversation the match is in."),
            channelName: stringProperty("Name of that conversation."),
            permalink: stringProperty("Link to the message."),
          },
        })
      ),
      totalCount: numberProperty("Total matches Slack reports."),
      page: numberProperty("Current results page."),
      pageCount: numberProperty("Total result pages."),
    },
  }),
  users_search: objectSchema({
    required: ["members"],
    properties: {
      members: arrayProperty(
        "Workspace members matching the query.",
        objectSchema({
          required: ["userId"],
          properties: {
            userId: stringProperty("User ID for mentions and direct messages."),
            name: stringProperty("Slack handle."),
            realName: stringProperty("Full name."),
            displayName: stringProperty("Display name, when set."),
            email: stringProperty("Email, when visible."),
            isBot: booleanProperty("True for bot users."),
            deleted: booleanProperty("True for deactivated users."),
            timeZone: stringProperty("IANA time zone."),
          },
        })
      ),
      nextCursor: stringProperty(
        "Pass as cursor to continue; absent on the last page."
      ),
    },
  }),
  conversations_add_message: objectSchema({
    description:
      "Delivery confirmation. channel and ts appear for text messages; file uploads omit them.",
    required: ["status"],
    properties: {
      status: constProperty("sent", "The message was posted."),
      channel: stringProperty("Conversation the message landed in."),
      ts: stringProperty("Timestamp of the posted message."),
    },
  }),
  slack_add_reaction: objectSchema({
    required: ["status"],
    properties: {
      status: constProperty("added", "The reaction was added."),
    },
  }),
} satisfies SchemaMap
