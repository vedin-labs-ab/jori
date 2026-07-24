import { type Integration } from "@contracts/integrations"
import { IntegrationLogo } from "@/shared/logo/integration"
import { Definition, Section } from "../section"
import { Handover } from "./handover"

/** The six connectable sources an app can be grounded in. */
const sourceIntegrations: readonly Integration[] = [
  "slack",
  "github",
  "linear",
  "gmail",
  "googleCalendar",
  "notion",
]

export function Apps() {
  return (
    <Section
      id="apps"
      lede="Describe the thing you keep doing by hand. Milo works out what it needs, builds the app, and puts it in front of the team."
      title="Every job ends in an app, not a message"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <div>
          <dl className="space-y-8">
            <Definition term="It holds real state">
              An app is not a saved summary. It stores the actual work: what is
              blocking, who owns it, what changed since yesterday.
            </Definition>
            <Definition term="A run keeps it current">
              Milo rechecks on a schedule, or when something happens in a
              connected tool. Open it tomorrow and it already knows.
            </Definition>
            <Definition term="The whole team opens the same one">
              One page for the organization, not a copy per person. Send people
              outside it a link that expires when you say so.
            </Definition>
            <Definition term="Grounded in your tools">
              <span className="flex flex-wrap items-center gap-1.5">
                It reads from
                {sourceIntegrations.map((integration) => (
                  <IntegrationLogo
                    className="size-3.5"
                    integration={integration}
                    key={integration}
                  />
                ))}
                and works from what is really there, not a wiki nobody updates.
              </span>
            </Definition>
          </dl>
        </div>
        <Handover />
      </div>
    </Section>
  )
}
