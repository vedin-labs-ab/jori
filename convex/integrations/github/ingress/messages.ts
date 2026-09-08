import { v } from "convex/values"
import { internal } from "../../../_generated/api"
import { internalMutation } from "../../../_generated/server"
import { observedMessageArgs } from "../../../messages/data"
import { readDataString } from "../../../shared/data"
import { findActiveIntegrationByExternalId } from "../../data"
import { getGitHubBotLogin } from "../data"

export const record = internalMutation({
  args: {
    ...observedMessageArgs,
    mode: v.optional(v.union(v.literal("record"), v.literal("record_and_run"))),
  },
  handler: async (ctx, args) => {
    const integration = await findActiveIntegrationByExternalId(ctx, {
      integration: "github",
      externalId: args.accountId,
    })

    if (integration === null) {
      return
    }

    await ctx.runMutation(internal.conversations.intake.record, {
      ...args,
      integration: "github",
      mentioned: mentionsGitHubApp(args.text, integration.data),
    })
  },
})

export function mentionsGitHubApp(text: string | undefined, data: unknown) {
  const identities = [readDataString(data, "appSlug"), getGitHubBotLogin(data)]
    .filter((identity): identity is string => Boolean(identity))
    .map((identity) => identity.toLowerCase())

  // Read complete handles before comparing: a hyphen continues a GitHub
  // login, while [bot] is part of an app bot's canonical login.
  const mentions = text?.matchAll(
    /(?:^|[^\w@-])@([a-z\d-]+(?:\[bot\])?)(?![\w@[-])/gi
  )

  for (const mention of mentions ?? []) {
    if (identities.includes(mention[1].toLowerCase())) {
      return true
    }
  }

  return false
}
