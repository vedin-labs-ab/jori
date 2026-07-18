import { providerPayload, type SchemaMap } from "./common"

// Every Slack tool returns a Slack Web API envelope unchanged: ok plus the
// method's payload fields.

export const slackToolResponseSchemas = {
  channels_list: providerPayload(
    "Slack's conversations.list response: ok, channels, and response_metadata.next_cursor for pagination."
  ),
  conversations_history: providerPayload(
    "Slack's conversations.history response: ok, messages (newest first), and has_more."
  ),
  conversations_replies: providerPayload(
    "Slack's conversations.replies response: ok and the thread's messages, parent first."
  ),
  conversations_search_messages: providerPayload(
    "Slack's search.messages response: ok and messages.matches with pagination info."
  ),
  users_search: providerPayload(
    "Slack's users.list response with members filtered to the query when one was given; ok, members, and response_metadata.next_cursor."
  ),
  conversations_add_message: providerPayload(
    "Slack's chat.postMessage response for text messages (ok, channel, ts, message), or the files.uploadV2 response when assets were attached."
  ),
  slack_add_reaction: providerPayload("Slack's reactions.add response: ok."),
} satisfies SchemaMap
