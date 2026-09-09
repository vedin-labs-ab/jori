import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { requireTokenCredentials } from "../connect/credentials"
import { NotionApiError } from "./api"

export function requireNotionCredentials(integration: Doc<"integrations">) {
  return requireTokenCredentials(
    integration,
    {
      tokens: {
        required: { access: "string" },
        optional: { refresh: "string" },
      },
    },
    "Missing Notion integration credentials"
  )
}

export async function expireRevokedNotionAccess(
  ctx: ActionCtx,
  integration: Doc<"integrations">,
  error: unknown
) {
  if (!(error instanceof NotionApiError) || error.status !== 401) {
    return
  }
  const expired = await ctx.runMutation(
    internal.integrations.notion.data.expire,
    {
      integrationId: integration._id,
      accessToken: requireNotionCredentials(integration).tokens.access,
    }
  )
  if (expired) {
    throw new Error("Notion access has expired and needs to be reconnected.")
  }
}
