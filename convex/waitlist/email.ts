import { sendEmail } from "../email"

/** Sent once, when an address first joins. It carries no user input, so
 *  nothing here needs escaping. */
export async function sendWaitlistConfirmation(
  ctx: Parameters<typeof sendEmail>[0],
  to: string
) {
  await sendEmail(ctx, {
    to,
    subject: "You're on the Jori waitlist",
    html: [
      "<p>Thanks for joining the Jori waitlist.</p>",
      "<p>We're opening it to a small number of teams at a time, so we can set each one up properly. You'll hear from us directly when there's a spot.</p>",
      "<p>If you want to move faster, reply to this email and tell us more about the work you'd hand over first. Replies reach a person.</p>",
    ].join("\n"),
    text: [
      "Thanks for joining the Jori waitlist.",
      "We're opening it to a small number of teams at a time, so we can set each one up properly. You'll hear from us directly when there's a spot.",
      "If you want to move faster, reply to this email and tell us more about the work you'd hand over first. Replies reach a person.",
    ].join("\n\n"),
  })
}
