import {
  defaultSelection,
  type ModelSelection,
} from "@contracts/models/selection"
import { type ReplyPart } from "@contracts/replies/parts"
import { History, Mail, TriangleAlert, Workflow } from "lucide-react"
import { type ChatSuggestion } from "@/shared/console/chat/suggestions"
import {
  type ChatContextUsage,
  type ChatConversation,
  type ChatMessage,
} from "@/shared/console/chat/types"
import { hour, minute } from "./clock"
import { demoId } from "./ids"
import { jobId } from "./jobs"
import { renewalsTableId } from "./materials/tables"
import { type ConversationId, type FolderId } from "./types"

/** A conversation as the workspace keeps it: its listing and its turns. */
export type DemoConversation = ChatConversation & {
  id: ConversationId
  folderId?: FolderId
  messages: ChatMessage[]
}

/** Each completed demo reply uses the same illustrative run cost. */
export const chatRunMicros = 84_000

/** What Jori answers with: the thinking first, then the text, and the
 *  parts after it. */
export type DemoReply = {
  reasoning: string
  text: string
  parts: ReplyPart[]
}

export const renewalsConversationId = demoId("conversations", "renewals")

/** How much of the model's window the conversation's run is using, as the
 *  composer shows it: a few turns in, most of it still free. */
export const chatContext: ChatContextUsage = {
  condensed: false,
  model: defaultSelection.model,
  runId: demoId("runs", "renewals"),
  turn: { cached: 41_200, input: 58_400, output: 640, reasoning: 210 },
  usedTokens: 58_400,
  windowTokens: 400_000,
}

/** The selection the demo's chats start on. */
export const chatSelection: ModelSelection = defaultSelection

/** What the home page offers to ask first. */
export const chatSuggestions: readonly ChatSuggestion[] = [
  { icon: TriangleAlert, text: "Which renewals are at risk?" },
  { icon: History, text: "What did the payroll fix change?" },
  { icon: Mail, text: "Remind vendors of unpaid invoices" },
  { icon: Workflow, text: "Summarize last week's runs" },
]

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
          text: `Which renewals in +[table:${renewalsTableId}] are at risk this month?`,
          parts: [],
          context: { kind: "table", id: renewalsTableId },
          references: [{ kind: "table", id: renewalsTableId }],
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
 *  the job that will keep it current, and the questions to settle before
 *  starting, answered together. */
export function demoReply(text: string): DemoReply {
  return {
    reasoning: [
      `The renewals table has what "${text}" needs: current rows with owners and dates.`,
      "Draft from those rows, post back here, and leave a job to keep the table current.",
      "Three things to settle first: where the summary goes, how often the job runs, and who the reminders come from.",
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
        description: "The channel the renewals thread already lives in.",
        options: [
          {
            label: "Yes, post it",
            value: "post",
            description: "A short note, with the rows it touched.",
          },
          {
            label: "Keep it here",
            value: "keep",
            description: "Nothing leaves this chat.",
          },
        ],
        freeform: true,
      },
      {
        kind: "choices",
        prompt: "How often should Renewals watch run?",
        description: "It keeps the table current between asks.",
        options: [
          { label: "Every morning", value: "daily" },
          {
            label: "Every Monday",
            value: "weekly",
            description: "Before the finance sync.",
          },
          { label: "Only when I ask", value: "manual" },
        ],
      },
      {
        kind: "choices",
        prompt: "Who should the reminders come from?",
        options: [
          { label: "Me", value: "me", description: "Sent from your address." },
          {
            label: "Jori",
            value: "jori",
            description: "Sent from Jori's, with you in copy.",
          },
        ],
      },
    ],
  }
}
