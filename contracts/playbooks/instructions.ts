import { type PlaybookCapability } from "./capabilities"

export type PlaybookInstructionContext = {
  /** Resolved provider label per capability slot, e.g. email: "Gmail". */
  providers: Record<PlaybookCapability, string>
  recipient: { email: string; name?: string }
}

export type PlaybookInstructions = (
  context: PlaybookInstructionContext
) => string

function recipientLine(recipient: PlaybookInstructionContext["recipient"]) {
  return recipient.name === undefined
    ? recipient.email
    : `${recipient.name} <${recipient.email}>`
}

export const morningBrief: PlaybookInstructions = ({
  providers,
  recipient,
}) => `Put together my morning brief.

Calendar: review today's events on my ${providers.calendar} — times, titles, and who is involved. Flag anything unusual: early starts, back-to-back stretches, or meetings with people outside the organization.

Inbox: scan my ${providers.email} for messages from the last 24 hours. Pick out what needs my attention or a reply; skip newsletters, notifications, and threads already handled.

Email the brief from my ${providers.email} to ${recipientLine(recipient)} with the subject "Morning brief" plus today's date. Keep it skimmable: a short schedule overview first, then the messages that matter with one line each on why. If the calendar is empty and nothing needs attention, say so in one line instead of padding.`

export const meetingPrep: PlaybookInstructions = ({
  providers,
  recipient,
}) => `Prepare me for today's meetings.

Check my ${providers.calendar} for today's events with other attendees. Skip focus blocks, all-day events, and holds without participants.

For each meeting, work out who I am meeting and what it is about: research external attendees and their companies on the web, and search my ${providers.email} for recent threads with the attendees to surface open questions or promised follow-ups.

Email one prep note from my ${providers.email} to ${recipientLine(recipient)} with the subject "Meeting prep" plus today's date — one section per meeting, ordered by start time, each with who is attending, the likely agenda, and what I should have ready. If there are no meetings with attendees today, skip the email.`

export const followUpSweep: PlaybookInstructions = ({
  providers,
  recipient,
}) => `Sweep my inbox for follow-ups.

Search my ${providers.email} for threads from the past two weeks that are waiting on me: direct questions I have not answered or requests I have not acted on. Also collect threads where someone has owed me a reply for more than two business days.

For each thread waiting on me, create a draft reply in my ${providers.email} so I only need to review and send. Keep drafts short and specific to the thread. Skip threads that already have a draft from an earlier sweep.

Email a summary from my ${providers.email} to ${recipientLine(recipient)} with the subject "Follow-up sweep" plus today's date: the new drafts with one line each, then the threads where I am owed a reply. If nothing needs following up, skip the email.`

export const weekInReview: PlaybookInstructions = ({
  providers,
  recipient,
}) => `Write my week in review.

Calendar: look back over this week's events on my ${providers.calendar} — where the time went, who I met, and anything that got moved or cancelled. Then peek at next week for what is coming.

Inbox: scan this week's threads in my ${providers.email} for what moved — decisions made, commitments given or received, and questions still open.

Email it from my ${providers.email} to ${recipientLine(recipient)} with the subject "Week in review" plus the date, in three short sections: what happened, what is unresolved, and what next week looks like. Keep each section to a handful of lines. If the week was quiet, say so in a line or two instead of padding.`
