import { type ReplyPart } from "@contracts/replies/parts"
import {
  type ChatConversation,
  type ChatMessage,
} from "@/shared/console/chat/types"
import { hour, minute } from "./clock"
import { demoId } from "./ids"
import { jobId } from "./jobs"
import { renewalsTableId } from "./materials/tables"

/** A conversation as the workspace keeps it: its listing and its turns. */
export type DemoConversation = ChatConversation & {
  messages: ChatMessage[]
}

/** What Jori answers with: the thinking first, then the text, and the
 *  parts after it. */
export type DemoReply = {
  reasoning: string
  text: string
  parts: ReplyPart[]
}

export const renewalsConversationId = demoId("conversations", "renewals")

/** What the home page offers to ask first. */
export const chatSuggestions = [
  "Which renewals are at risk this month?",
  "What did the payroll fix change?",
  "Draft reminders for the unpaid vendor invoices",
  "Summarize last week's runs",
] as const

/** The conversation the chat opens on: the question the hero's thread
 *  answers in Slack, asked here instead, with the table as the answer. */
export function demoConversations(now: number): DemoConversation[] {
  const asked = now - 2 * hour - 4 * minute

  return [
    {
      id: renewalsConversationId,
      title: "Which renewals are at risk this month?",
      updatedAt: asked + 40_000,
      messages: [
        {
          id: demoId("messages", "renewals-ask"),
          role: "person",
          text: "Which renewals are at risk this month?",
          parts: [],
          context: { kind: "table", id: renewalsTableId },
          createdAt: asked,
        },
        {
          id: demoId("messages", "renewals-reply"),
          role: "jori",
          text: [
            "One of the four renewals is at risk.",
            "",
            "| Customer | Renews | Status | Paid |",
            "| --- | --- | --- | --- |",
            "| **Harbor House** | Sep 24 | At risk | No |",
            "| Beacon Works | Oct 2 | On track | Yes |",
            "| Juniper Supply | Oct 9 | On track | Yes |",
            "| Larkspur Hotels | Oct 15 | On track | No |",
            "",
            "Harbor House has not paid and nobody has reminded them yet. Larkspur Hotels is unpaid too, but a reminder went out and the renewal is three weeks off.",
          ].join("\n"),
          parts: [
            {
              kind: "reference",
              target: { kind: "table", id: renewalsTableId },
            },
            {
              kind: "choices",
              options: [
                { label: "Remind Harbor House" },
                { label: "Show all unpaid renewals" },
              ],
            },
          ],
          createdAt: asked + 40_000,
        },
      ],
    },
  ]
}

/** The reply Jori gives whatever is asked in the demo: the ask taken on,
 *  the job that will keep it current, and one question before starting. */
export function demoReply(text: string): DemoReply {
  return {
    reasoning: [
      `The renewals table has what "${text}" needs: current rows with owners and dates.`,
      "Draft from those rows, post back here, and leave a job to keep the table current.",
      "One thing to settle first: whether the summary goes to #finance.",
    ].join("\n"),
    text: [
      `Taking that on. I read the renewals table against "${text}" and there is enough there to work from.`,
      "",
      "Here is the plan:",
      "",
      "1. Draft what is needed from the table's current rows.",
      "2. Post the result back here, with the rows it touched.",
      "3. Leave **Renewals watch** to keep the table current.",
    ].join("\n"),
    parts: [
      { kind: "reference", target: { kind: "job", id: jobId("watch") } },
      {
        kind: "choices",
        prompt: "Post a summary to #finance when it is done?",
        options: [
          { label: "Yes, post it", value: "post" },
          { label: "Keep it here", value: "keep" },
        ],
        freeform: true,
      },
    ],
  }
}
