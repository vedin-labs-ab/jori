import { type GenericCtx } from "@convex-dev/better-auth"
import { escapeHtml } from "../../contracts/text"
import { type DataModel } from "../_generated/dataModel"
import { sendEmail } from "../email"
import { requireOrigin } from "../shared/origin"

export type Invitation = {
  email: string
  organization: { name: string }
  inviter: { user: { name: string; email: string } }
}

/** Delivers an organization invite. Acceptance is in-app: the invitee signs
 *  in with the invited address and the pending invitation is waiting. */
export async function sendInvitation(
  ctx: GenericCtx<DataModel>,
  invitation: Invitation
) {
  if (!("runMutation" in ctx)) {
    throw new Error("Invitations require a mutable context")
  }

  const organization = invitation.organization.name
  const consoleUrl = `${requireOrigin()}/console`

  await sendEmail(ctx, {
    to: invitation.email,
    subject: `${invitation.inviter.user.name} invited you to ${organization} on Milo`,
    html: invitationHtml(invitation, consoleUrl),
    text: invitationText(invitation, consoleUrl),
  })
}

function invitationHtml(invitation: Invitation, consoleUrl: string) {
  const inviter = escapeHtml(invitation.inviter.user.name)
  const email = escapeHtml(invitation.inviter.user.email)
  const organization = escapeHtml(invitation.organization.name)

  return [
    `<p>${inviter} (${email}) invited you to join <strong>${organization}</strong> on Milo.</p>`,
    `<p>Sign in with this email address and the invitation will be waiting for you.</p>`,
    `<p><a href="${consoleUrl}">Open Milo</a></p>`,
  ].join("\n")
}

function invitationText(invitation: Invitation, consoleUrl: string) {
  const { name, email } = invitation.inviter.user

  return [
    `${name} (${email}) invited you to join ${invitation.organization.name} on Milo.`,
    "Sign in with this email address and the invitation will be waiting for you.",
    consoleUrl,
  ].join("\n\n")
}
