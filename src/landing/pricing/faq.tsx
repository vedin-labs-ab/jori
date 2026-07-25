import { formatUsd, trial } from "@contracts/billing"
import { Definition, Section } from "../section"

/**
 * Four questions, and only the four.
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
      className="border-y bg-muted/50"
      lede="The short version. For access and data, the trust page goes deeper."
      title="Questions, answered straight"
    >
      <dl className="grid gap-x-16 gap-y-8 md:grid-cols-2">
        <Definition term="Can a bill surprise me?">
          No. There is no metered invoice at the end of the month. Usage draws
          from prepaid money, auto top-up is opt-in with a monthly cap, and the
          console shows a live tally.
        </Definition>
        <Definition term="How is usage billed?">
          In dollars, at the model provider's public list rates. Keeping an app
          current costs cents a day; building one, or a deep research run, can
          cost a few dollars. Every run shows its exact cost in its receipt.
        </Definition>
        <Definition term="Is there a free trial?">
          Yes. {trial.days} days with {formatUsd(trial.grantMicros)} of usage
          included, no card required. It ends when the days or the usage run
          out, whichever comes first.
        </Definition>
        <Definition term="What happens if I cancel?">
          Automations pause and nothing is deleted. Your data, integrations, and
          history stay put, and everything resumes when you come back.
        </Definition>
      </dl>
    </Section>
  )
}
