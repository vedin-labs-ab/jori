import { escapeHtml } from "../../contracts/text"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { authComponent, createAdapterOptions } from "../auth"
import { requireOrigin } from "../shared/origin"
import { dayMs, noticeMs } from "./data"

/** Wait for Bird acceptance before starting the final seven-day window. */
export async function ensureNotice(
  ctx: MutationCtx,
  row: Doc<"workspaceRetention">
) {
  if (row.noticeAt !== undefined) {
    return row.noticeAt
  }
  if (row.noticeId) {
    const submission = await ctx.db.get(row.noticeId)
    if (submission?.status === "accepted") {
      const now = Date.now()
      await ctx.db.patch(row._id, {
        noticeAt: now,
        deletesAt: Math.max(row.deletesAt, now + noticeMs),
        blocked: undefined,
      })
      return now
    }
    if (submission && ["queued", "sending"].includes(submission.status)) {
      return null
    }
  }
  if ((row.noticeRetryAt ?? 0) > Date.now()) {
    return null
  }
  const recipient = await ownerEmail(ctx, row.organizationId)
  if (!recipient) {
    await ctx.db.patch(row._id, {
      blocked:
        "No workspace owner email is available. Contact support before deletion.",
    })
    return null
  }
  const date = new Date(Math.max(row.deletesAt, Date.now() + noticeMs))
    .toISOString()
    .slice(0, 10)
  const text = `Your Jori workspace "${recipient.name}" is scheduled for deletion on or after ${date} because its subscription ended or its trial expired. Export your workspace from Settings before then, or reactivate it to keep your data. Contact support@usejori.com for help or an earlier deletion.\n\n${requireOrigin()}/runs`
  const noticeId = await ctx.runMutation(internal.email.queue.enqueue, {
    organizationId: row.organizationId,
    message: {
      to: recipient.email,
      subject: `Jori: ${recipient.name} is scheduled for deletion`,
      text,
      html: `<p>${escapeHtml(text).replaceAll("\n", "<br>")}</p>`,
    },
  })
  await ctx.db.patch(row._id, {
    noticeId,
    noticeRetryAt: Date.now() + dayMs,
    blocked: "Waiting for deletion notice delivery.",
  })
  return null
}

async function ownerEmail(ctx: MutationCtx, organizationId: string) {
  const adapter = authComponent.adapter(ctx)(createAdapterOptions())
  const organization = await adapter.findOne<{ name: string }>({
    model: "organization",
    where: [{ field: "id", value: organizationId }],
  })
  const members = await adapter.findMany<{ userId: string; role: string }>({
    model: "member",
    where: [{ field: "organizationId", value: organizationId }],
    limit: 100,
  })
  for (const member of members) {
    if (!member.role.split(",").includes("owner")) {
      continue
    }
    const user = await authComponent.getAnyUserById(ctx, member.userId)
    if (user?.email) {
      return { email: user.email, name: organization?.name ?? organizationId }
    }
  }
  return null
}
