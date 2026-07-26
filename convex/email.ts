import { Resend } from "@convex-dev/resend"
import { components } from "./_generated/api"
import { readEnvironmentVariable } from "./shared/environment"

const resend = new Resend(components.resend, { testMode: false })

/** Resend's own accepted context, so callers pass whatever they already hold
 *  instead of this module restating the union. */
type DeliveryCtx = Parameters<Resend["sendEmail"]>[0]

/** Resend's shared test domain. It only delivers to the account owner, so it
 *  is a development fallback, never the production sender. */
const fallbackSender = "Jori <onboarding@resend.dev>"

export type Message = {
  to: string
  subject: string
  html: string
  text: string
}

/** Every email Jori sends goes through here, so the sender address is
 *  resolved in exactly one place. */
export async function sendEmail(ctx: DeliveryCtx, message: Message) {
  await resend.sendEmail(ctx, {
    from: readEnvironmentVariable("JORI_EMAIL_FROM") ?? fallbackSender,
    ...message,
  })
}
