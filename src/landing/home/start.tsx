import { integrationLabels, integrations } from "@contracts/integrations"
import { type ReactNode } from "react"
import { IntegrationLogo } from "@/shared/logo/integration"
import { Chip, Section } from "../section"

export function Start() {
  return (
    <Section
      lede="Setup takes a few minutes in the console. The first app takes one conversation."
      title="Running the same day"
    >
      <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
        <Step index="01" title="Point Milo at your website">
          <p>
            It reads your public site to learn what your company does. That's
            the whole introduction.
          </p>
        </Step>
        <Step index="02" title="Connect your tools">
          <div className="flex flex-wrap gap-1.5">
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
        </Step>
        <Step index="03" title="Hand over the first job">
          <p>
            Describe something your team does by hand every week. Milo builds
            the app and starts keeping it current.
          </p>
        </Step>
      </ol>
    </Section>
  )
}

function Step({
  children,
  index,
  title,
}: {
  children: ReactNode
  index: string
  title: string
}) {
  return (
    <li>
      <p className="font-medium text-muted-foreground text-sm tabular-nums">
        {index}
      </p>
      <h3 className="mt-2 font-medium">{title}</h3>
      <div className="mt-2 max-w-sm text-muted-foreground text-sm leading-relaxed">
        {children}
      </div>
    </li>
  )
}
