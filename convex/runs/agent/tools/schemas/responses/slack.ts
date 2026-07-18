import {
  booleanField,
  constField,
  enumField,
  type JsonSchema,
  listField,
  numberField,
  resultSchema,
  type SchemaMap,
  stringField,
} from "./common"

// Slack results are normalized at the broker edge; identifiers keep Slack's
// values so they thread straight back into follow-up calls.

function slackMessageProperties() {
  return {
    ts: stringField("Message timestamp; identifies the message."),
    threadTs: stringField("Parent timestamp for threaded messages."),
    userId: stringField("Author user ID."),
    botId: stringField("Author bot ID for bot messages."),
    subtype: stringField("Slack message subtype, when not a plain message."),
    text: stringField("Message text in Slack mrkdwn."),
    blocks: listField("Block Kit content, when the message carries it.", {
      type: "object",
      additionalProperties: true,
    }),
    reactions: listField(
      "Reactions on the message.",
      resultSchema({
        properties: {
          name: stringField("Emoji name."),
          count: numberField("How many members reacted."),
        },
      })
    ),
    replyCount: numberField("Thread reply count, on thread parents."),
    edited: booleanField("True when the message was edited."),
  }
}

function slackMessageSchema(): JsonSchema {
  return resultSchema({
    description: "Normalized Slack message.",
    required: ["ts", "text"],
    properties: slackMessageProperties(),
  })
}

function messageListing(description: string): JsonSchema {
  return resultSchema({
    required: ["messages", "hasMore"],
    properties: {
      messages: listField(description, slackMessageSchema()),
      hasMore: booleanField("True when more messages exist in the range."),
    },
  })
}

export const slackToolResponseSchemas = {
  channels_list: resultSchema({
    required: ["channels"],
    properties: {
      channels: listField(
        "Conversations of the requested types.",
        resultSchema({
          required: ["channelId", "type"],
          properties: {
            channelId: stringField("Conversation ID for other Slack calls."),
            name: stringField("Channel name; absent for direct messages."),
            type: enumField(
              ["public_channel", "private_channel", "im", "mpim"],
              "Conversation type."
            ),
            topic: stringField("Channel topic, when set."),
            memberCount: numberField("Member count, when Slack reports it."),
            archived: booleanField("True for archived channels."),
            userId: stringField("Counterpart user ID for direct messages."),
          },
        })
      ),
      nextCursor: stringField(
        "Pass as cursor to continue; absent on the last page."
      ),
    },
  }),
  conversations_history: messageListing("Messages, newest first."),
  conversations_replies: messageListing("The thread, parent message first."),
  conversations_search_messages: resultSchema({
    required: ["matches", "totalCount"],
    properties: {
      matches: listField(
        "Matching messages with their source conversation.",
        resultSchema({
          required: ["ts", "text"],
          properties: {
            ...slackMessageProperties(),
            channelId: stringField("Conversation the match is in."),
            channelName: stringField("Name of that conversation."),
            permalink: stringField("Link to the message."),
          },
        })
      ),
      totalCount: numberField("Total matches Slack reports."),
      page: numberField("Current results page."),
      pageCount: numberField("Total result pages."),
    },
  }),
  users_search: resultSchema({
    required: ["members"],
    properties: {
      members: listField(
        "Workspace members matching the query.",
        resultSchema({
          required: ["userId"],
          properties: {
            userId: stringField("User ID for mentions and direct messages."),
            name: stringField("Slack handle."),
            realName: stringField("Full name."),
            displayName: stringField("Display name, when set."),
            email: stringField("Email, when visible."),
            isBot: booleanField("True for bot users."),
            deleted: booleanField("True for deactivated users."),
            timeZone: stringField("IANA time zone."),
          },
        })
      ),
      nextCursor: stringField(
        "Pass as cursor to continue; absent on the last page."
      ),
    },
  }),
  conversations_add_message: resultSchema({
    description:
      "Delivery confirmation. channel and ts appear for text messages; file uploads omit them.",
    required: ["status"],
    properties: {
      status: constField("sent", "The message was posted."),
      channel: stringField("Conversation the message landed in."),
      ts: stringField("Timestamp of the posted message."),
    },
  }),
  slack_add_reaction: resultSchema({
    required: ["status"],
    properties: {
      status: constField("added", "The reaction was added."),
    },
  }),
} satisfies SchemaMap
