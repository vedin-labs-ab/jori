import { formatUsd, interactiveGraceMicros } from "@contracts/billing"
import { Link } from "@tanstack/react-router"
import { type ReactNode } from "react"
import { Jori } from "@/shared/brand"
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
        Scheduled runs pause. Work in a conversation can use up to{" "}
        {formatUsd(interactiveGraceMicros)} beyond your balance. Add credit or
        wait for the monthly reset to continue.
      </>
    ),
  },
  {
    question: "Does inviting someone change the price?",
    answer:
      "No. The monthly plan covers everyone in your organization, with no per-seat fees.",
  },
  {
    question: "How is AI usage priced?",
    answer:
      "In dollars, at the model provider's published rates. We don't add a markup. Each run shows its cost.",
  },
  {
    question: "What happens if we cancel?",
    answer:
      "Jobs pause. Your data, integrations, and run history stay in your workspace so you can resume when you resubscribe.",
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
          explains how <Jori tilt="left" /> handles permissions and where data
          is processed.
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
