import { v } from "convex/values"
import { internal } from "../../../_generated/api"
import { internalMutation } from "../../../_generated/server"
import { observedMessageArgs } from "../../../messages/data"
import { readDataString } from "../../../shared/data"
import { findActiveIntegrationByExternalId } from "../../data"

export const record = internalMutation({
  args: {
    ...observedMessageArgs,
    mode: v.optional(v.union(v.literal("record"), v.literal("record_and_run"))),
  },
  handler: async (ctx, args) => {
    const integration = await findActiveIntegrationByExternalId(ctx, {
      integration: "linear",
      externalId: args.accountId,
    })

    if (integration === null) {
      return
    }

    await ctx.runMutation(internal.conversations.intake.record, {
      ...args,
      integration: "linear",
      mentioned: mentionsLinearApp(args.text, integration.data),
    })
  },
})

export function mentionsLinearApp(text: string | undefined, data: unknown) {
  if (text === undefined) {
    return false
  }

  const displayName = readDataString(data, "botDisplayName")
  const profileUrl = readDataString(data, "botUrl")

  return (
    mentionsDisplayName(text, displayName) || mentionsProfile(text, profileUrl)
  )
}

function mentionsDisplayName(text: string, displayName: string | undefined) {
  if (displayName === undefined || displayName === "") {
    return false
  }

  // Linear's displayName is unique within its workspace. Its full name is
  // not an identity, and hyphens/dots/underscores must not end a handle.
  const escaped = displayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(
    `(?:^|[^\\p{L}\\p{N}_@.-])@${escaped}(?=$|[\\s,;:!?()\\[\\]{}<>"']|\\.(?=\\s|$))`,
    "iu"
  ).test(text)
}

function mentionsProfile(text: string, profileUrl: string | undefined) {
  if (profileUrl === undefined || profileUrl === "") {
    return false
  }

  // Compare whole URL tokens so another workspace/profile, a longer path,
  // or a URL containing this URL in its query cannot address the app.
  for (const match of text.matchAll(/https?:\/\/[^\s<>()[\]"']+/g)) {
    if (match[0].replace(/[.,;:!?]+$/, "") === profileUrl) {
      return true
    }
  }

  return false
}
