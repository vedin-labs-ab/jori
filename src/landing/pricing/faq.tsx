import { formatUsd, interactiveGraceMicros, trial } from "@contracts/billing"
import { Link } from "@tanstack/react-router"
import { Definition, Section } from "../section"

/**
 * Five questions, and only the five.
 *
 * The block above says the numbers are not final, and a reader left with just
 * that fills the gap with the worst version of it: an AI product that bills
 * whatever it likes. So this answers the fears that would stop someone
 * joining, and nothing else. A question that restates the principles above it,
 * or that the trust page already answers properly, is not a question.
 */
export function Faq() {
  return (
    <Section
      lede={
        <>
          The short version. For access and data,{" "}
          <Link
            className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
            to="/trust"
          >
            the trust page
          </Link>{" "}
          goes deeper.
        </>
      }
      title="What people ask"
    >
      <dl className="grid gap-x-12 gap-y-8 md:grid-cols-2">
        <Definition term="What happens when usage runs out?">
          Scheduled runs stop at zero. Interactive work carries{" "}
          {formatUsd(interactiveGraceMicros)} of grace below it, so Jori never
          goes silent halfway through answering you.
        </Definition>
        <Definition term="What does a run cost?">
          A Jori run's cost depends on the model, the amount of text it
          processes and generates, and any additional services it uses. Each run
          has an itemized receipt showing what was billed.
        </Definition>
        <Definition term="Is there a free trial?">
          Yes. {trial.days} days and {formatUsd(trial.allowanceMicros)} of
          usage, no card. It ends when either runs out.
        </Definition>
        <Definition term="What happens if I cancel?">
          Jobs pause and nothing is deleted. Your data, integrations, and
          history stay put, and everything resumes when you come back.
        </Definition>
        <Definition term="How do I see what a team spends?">
          Open Usage on the team's folder. Spend rolls up by subfolder and by
          source for the window you choose, and every number opens to the runs
          behind it.
        </Definition>
      </dl>
    </Section>
  )
}
