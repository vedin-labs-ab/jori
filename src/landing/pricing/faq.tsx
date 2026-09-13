import { formatUsd, interactiveGraceMicros } from "@contracts/billing"
import { Link } from "@tanstack/react-router"
import { type ReactNode } from "react"
import { Section } from "../section"

/**
 * Four questions, and only the four: the ones that would stop someone
 * joining. A question the plan above already answers, or that the trust
 * page answers properly, is not a question.
 */
const questions: readonly { answer: ReactNode; question: string }[] = [
  {
    question: "What happens when the included AI usage runs out?",
    answer: (
      <>
        Scheduled runs pause. Interactive work carries{" "}
        {formatUsd(interactiveGraceMicros)} of grace below zero, so Jori never
        goes silent halfway through an answer. Add credit, or wait for the
        monthly reset.
      </>
    ),
  },
  {
    question: "Does inviting someone change the price?",
    answer:
      "No. Everyone joins, including the people who only ever open a page someone handed them.",
  },
  {
    question: "How is AI usage priced?",
    answer:
      "In dollars, at the provider's published rates for the model that answered. What we make on it is what good caching saves, never a multiplier on your bill.",
  },
  {
    question: "What happens if we cancel?",
    answer:
      "Jobs pause and nothing is deleted. Your data, integrations, and history stay put, and everything resumes when you come back.",
  },
]

export function Faq() {
  return (
    <Section
      beside
      lede={
        <>
          For access and data,{" "}
          <Link
            className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
            to="/trust"
          >
            the trust page
          </Link>{" "}
          goes deeper.
        </>
      }
      title="Good to know before you start."
    >
      <dl className="divide-y border-y">
        {questions.map((entry) => (
          <div className="py-5" key={entry.question}>
            <dt className="font-medium">{entry.question}</dt>
            <dd className="mt-1.5 max-w-xl text-muted-foreground text-sm leading-relaxed">
              {entry.answer}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}
