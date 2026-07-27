import { integrationLabels, integrations } from "@contracts/integrations"
import { IntegrationLogo } from "@/shared/logo/integration"
import { Chip, Definition, Section } from "../section"
import { Handover } from "./handover"

export function Apps() {
  return (
    <Section
      id="apps"
      lede="Describe what your team keeps doing by hand. Jori works out what it needs, builds the app, and puts it in front of everyone."
      title="When the work repeats, it gets an app"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <div>
          <dl className="space-y-8">
            <Definition term="It holds real state">
              Not a saved summary. What is blocking, who owns it, and what
              changed since yesterday.
            </Definition>
            {/* Second, not third. One shared page is the line between this and
                every agent that answers one person at a time, so it does not
                sit last behind two facts about the page itself. */}
            <Definition term="One page, not one per person">
              Everyone opens the same one, holding the same state. Send it
              outside the company with a link that expires when you say so.
            </Definition>
            <Definition term="A run keeps it current">
              Jori rechecks on a schedule, or when something moves in a
              connected tool. Open it tomorrow and it already knows.
            </Definition>
          </dl>
          {/* Where the sources come from is the Context section's argument, so
              this row carries the other half: these are modelled, not merely
              reachable. Naming that is what stops a short list reading as a
              short list. */}
          <div className="mt-12">
            <p className="text-muted-foreground text-sm">
              Modelled in depth, not just connected.
            </p>
            <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
              {integrations.map((integration) => (
                <Chip key={integration}>
                  <IntegrationLogo
                    className="size-3"
                    decorative
                    integration={integration}
                  />
                  {integrationLabels[integration]}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <Handover />
      </div>
    </Section>
  )
}
