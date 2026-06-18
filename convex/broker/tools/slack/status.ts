import { type Doc } from "../../../_generated/dataModel"
import { slackJsonApi } from "../../../providers/slack/api"
import { requireSlackCredentials } from "../../../providers/slack/credentials"

export async function setSlackThreadStatus(
  integration: Doc<"integrations">,
  args: {
    channelId: string
    status: string
    threadTs: string
  }
) {
  const credentials = requireSlackCredentials(integration)

  return await slackJsonApi(credentials.bot, "assistant.threads.setStatus", {
    channel_id: args.channelId,
    status: args.status,
    thread_ts: args.threadTs,
  })
}
