import { formatUsd, trial } from "@contracts/billing"
import { Link } from "@tanstack/react-router"
import { Definition, Section } from "../section"

export function Faq() {
  return (
    <Section
      className="border-y bg-muted/50"
      lede="The short version. For access and data, the trust page goes deeper."
      title="Questions, answered straight"
    >
      <dl className="grid gap-x-16 gap-y-8 md:grid-cols-2">
        <Definition term="How is usage billed?">
          In dollars, at the model provider's public list rates. Keeping an app
          current costs cents a day; building one, or a deep research run, can
          cost a few dollars. Every run shows its exact cost in its receipt.
        </Definition>
        <Definition term="What does the monthly price cover?">
          Milo being on staff: the always-on background work that keeps your
          apps current, plus the included usage. Included usage resets monthly.
          Wallet top-ups are prepaid and roll over until used.
        </Definition>
        <Definition term="Is there a free trial?">
          Yes. {trial.days} days with {formatUsd(trial.grantMicros)} of usage
          included, no card required. It ends when the days or the usage run
          out, whichever comes first.
        </Definition>
        <Definition term="Can a bill surprise me?">
          No. There is no metered invoice at the end of the month. Usage draws
          from prepaid money, auto top-up is opt-in with a monthly cap, and the
          console shows a live tally.
        </Definition>
        <Definition term="What happens if I cancel?">
          Automations pause and nothing is deleted. Your data, integrations, and
          history stay put, and everything resumes when you come back.
        </Definition>
        <Definition term="Who sees what Milo reads?">
          Milo works with the accounts each person connects, as that person.
          Personal work stays personal; organization work is visible to the
          team.{" "}
          <Link
            className="font-medium text-primary hover:underline"
            to="/trust"
          >
            More on the trust page.
          </Link>
        </Definition>
        <Definition term="GDPR and DPAs?">
          Milo is built to operate in line with GDPR. Data processing agreements
          are available from launch.
        </Definition>
      </dl>
    </Section>
  )
}
