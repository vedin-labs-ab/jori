import { integrationLabels, integrations } from "@contracts/integrations"
import { IntegrationLogo } from "@/shared/logo/integration"
import { Chip, Definition, Section } from "../section"
import { Handover } from "./handover"

export function Apps() {
  return (
    <Section
      id="apps"
      lede="Describe what your team keeps doing by hand. Milo works out what it needs, builds the app, and puts it in front of everyone."
      title="When the work repeats, it gets an app"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <div>
          <dl className="space-y-8">
            <Definition term="It holds real state">
              Not a saved summary. What is blocking, who owns it, and what
              changed since yesterday.
            </Definition>
            <Definition term="A run keeps it current">
              Milo rechecks on a schedule, or when something moves in a
              connected tool. Open it tomorrow and it already knows.
            </Definition>
            <Definition term="One page for the whole team">
              Not a copy per person. Send it outside the company with a link
              that expires when you say so.
            </Definition>
          </dl>
          {/* An app is only as good as what grounds it, so the sources are
              named rather than implied by a row of logos. */}
          <div className="mt-12">
            <p className="text-muted-foreground text-sm">
              Built from what is really there, not a wiki nobody updates.
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
              {/* Dashed, the way this system already marks something that
                  is not there yet, so the row reads as unfinished by design
                  rather than as a connector called "more". */}
              <Chip className="border-dashed">+ more</Chip>
            </div>
          </div>
        </div>
        <Handover />
      </div>
    </Section>
  )
}
