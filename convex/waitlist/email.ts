import { sendEmail } from "../email"

/** Sent once, when an address first joins. It carries no user input, so
 *  nothing here needs escaping.
 *
 *  It does not invite a reply. Jori sends from a subdomain with no mailbox
 *  behind it, so a reply reaches no one, and the form already asked what work
 *  the team would hand over first — asking twice would trade a real answer for
 *  one that is silently discarded. */
const paragraphs = [
  "Thanks for joining the Jori waitlist.",
  "We're opening it to a small number of teams at a time, so we can set each one up properly. You'll hear from us directly when there's a spot.",
]

export async function sendWaitlistConfirmation(
  ctx: Parameters<typeof sendEmail>[0],
  to: string
) {
  await sendEmail(ctx, {
    to,
    subject: "You're on the Jori waitlist",
    html: paragraphs.map((line) => `<p>${line}</p>`).join("\n"),
    text: paragraphs.join("\n\n"),
  })
}
