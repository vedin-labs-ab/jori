import { type GenericCtx } from "@convex-dev/better-auth"
import { Resend } from "@convex-dev/resend"
import { components } from "../_generated/api"
import { type DataModel } from "../_generated/dataModel"
import { readEnvironmentVariable } from "../shared/environment"
import { requireOrigin } from "../shared/origin"

const resend = new Resend(components.resend, { testMode: false })

const defaultSender = "Milo <onboarding@resend.dev>"

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

  await resend.sendEmail(ctx, {
    from: readEnvironmentVariable("MILO_EMAIL_FROM") ?? defaultSender,
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
