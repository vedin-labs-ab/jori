import { Resend } from "@convex-dev/resend"
import { components } from "./_generated/api"

const resend = new Resend(components.resend, { testMode: false })

/** Resend's own accepted context, so callers pass whatever they already hold
 *  instead of this module restating the union. */
type DeliveryCtx = Parameters<Resend["sendEmail"]>[0]

/** Who Jori's mail comes from. This is a product decision, not deployment
 *  configuration: the address is the same wherever Jori runs, and what an
 *  environment is allowed to send is already decided by the Resend key it
 *  holds. Mail goes out on a subdomain so the apex keeps its own reputation.
 *
 *  Replies do not reach a person. Nothing Jori sends asks for one yet; the
 *  day something does, it needs a reply-to on a mailbox that exists. */
const sender = "Jori <hello@mail.usejori.com>"

export type Message = {
  to: string
  subject: string
  html: string
  text: string
}

/** Every email Jori sends goes through here, so the sender address is
 *  resolved in exactly one place. */
export async function sendEmail(ctx: DeliveryCtx, message: Message) {
  await resend.sendEmail(ctx, { from: sender, ...message })
}
