import { integrationLabels } from "@contracts/integrations"
import { type ReactNode } from "react"
import { Closing } from "../cta"
import { Chip, Section } from "../section"

export function Start() {
  return (
    <>
      <Section
        lede="Setup takes a few minutes in the console."
        title="Running before your next meeting"
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
              {Object.values(integrationLabels).map((label) => (
                <Chip key={label}>{label}</Chip>
              ))}
            </div>
          </Step>
          <Step index="03" title="Enable a playbook">
            <p>
              Pick one, choose where it delivers, done. Tomorrow starts with a
              brief.
            </p>
          </Step>
        </ol>
      </Section>
      <Closing lede="Your first brief can land tomorrow at 08:00." />
    </>
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
