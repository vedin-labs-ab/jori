import { Definition, Section } from "../section"
import { Handover } from "./handover"

/** The handover pillar. "Just instructions" is the line against builder
 *  products, and "one teammate, many jobs" is what reconciles a singular
 *  agent with per-job access before the control section lands it. */
export function Jobs() {
  return (
    <Section
      lede="Describe the job the way you'd brief a person, in plain text. Run it on a schedule, or when something happens. It runs in the cloud under the access you gave that job, on the model you picked for it, whether or not your laptop is open."
      title="Jobs are just instructions"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <dl className="space-y-8">
          <Definition term="Plain text, not pipelines">
            No node graphs, nothing to wire. If you can write the brief, you've
            written the job.
          </Definition>
          <Definition term="One teammate, many jobs">
            Every job carries its own scoped access. Jori stays one teammate;
            its permissions never exceed the job it's running.
          </Definition>
          <Definition term="The right model per job">
            Fast and cheap for the daily digest, frontier for the hard analysis.
            Chosen per job, not per contract.
          </Definition>
        </dl>
        <Handover />
      </div>
    </Section>
  )
}
