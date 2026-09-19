import { storage } from "../../../../contracts/billing"
import { escapeHtml } from "../../../../contracts/text"
import { internal } from "../../../_generated/api"
import { type Doc } from "../../../_generated/dataModel"
import { type MutationCtx } from "../../../_generated/server"
import { dayMs } from "../../../retention/data"
import { ownerEmail } from "../../../retention/notice"
import { requireOrigin } from "../../../shared/origin"

/** A queued or failed message never starts a deletion countdown. */
export async function ensureNotice(ctx: MutationCtx, row: Doc<"fileUsage">) {
  if (row.overCapacityAt !== undefined) {
    return row.overCapacityAt
  }
  if (row.overCapacityNoticeId !== undefined) {
    const notice = await ctx.db.get(row.overCapacityNoticeId)
    if (
      notice?.status === "accepted" &&
      notice.organizationId === row.organizationId
    ) {
      const now = Date.now()
      await ctx.db.patch(row._id, {
        overCapacityAt: now,
        overCapacityRetryAt: undefined,
      })
      return now
    }
    if (notice && ["queued", "sending"].includes(notice.status)) {
      return null
    }
  }
  if ((row.overCapacityRetryAt ?? 0) > Date.now()) {
    return null
  }
  const recipient = await ownerEmail(ctx, row.organizationId)
  if (recipient === null) {
    await ctx.db.patch(row._id, { overCapacityRetryAt: Date.now() + dayMs })
    return null
  }
  const earliest = new Date(Date.now() + storage.graceMs)
    .toISOString()
    .slice(0, 10)
  const text = `Your Jori workspace "${recipient.name}" is using more file storage than its current capacity. Uploads and changes that increase storage are paused. You can still view, download, and delete files you have access to.\n\nAdd storage in Billing or delete files to get within capacity. If the workspace remains over capacity, Jori will permanently delete its newest files first, stopping once it fits. Deletion will not begin before ${earliest}, and never less than 30 days after this notice is submitted successfully. Billing shows the current deadline and affected files you have access to.\n\n${requireOrigin()}/console?billing=portal\n\nContact support@usejori.com for help.`
  const noticeId = await ctx.runMutation(internal.email.queue.enqueue, {
    organizationId: row.organizationId,
    message: {
      to: recipient.email,
      subject: `Jori: ${recipient.name} is over its storage capacity`,
      text,
      html: `<p>${escapeHtml(text).replaceAll("\n", "<br>")}</p>`,
    },
  })
  await ctx.db.patch(row._id, {
    overCapacityNoticeId: noticeId,
    overCapacityRetryAt: Date.now() + dayMs,
  })
  return null
}
