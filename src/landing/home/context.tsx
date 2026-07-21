import { type Integration } from "@contracts/integrations"
import {
  IntegrationLogo,
  IntegrationLogoStack,
} from "@/shared/logo/integration"
import { Prop, Section } from "../section"

export function ContextSection() {
  return (
    <Section
      lede="Point Milo at your website and connect your tools. It works out the rest, and keeps it current from real activity instead of a wiki nobody updates."
      title="It knows what your company is working on"
    >
      <div className="grid items-start gap-10 md:grid-cols-2 lg:gap-16">
        <div className="space-y-5 text-muted-foreground text-sm leading-relaxed">
          <p className="max-w-xl">
            Workstreams are deduced from what actually moves: threads, commits,
            issues, meetings. They surface while work is live and go quiet when
            it stops, so Milo's picture of the company stays honest.
          </p>
          <p className="max-w-xl">
            People and places get the same treatment. Who owns what, what each
            channel is for, which customer belongs to which thread: learned the
            way a new teammate would learn it, by paying attention.
          </p>
        </div>
        <Workstreams />
      </div>
    </Section>
  )
}

function Workstreams() {
  return (
    <Prop
      label={
        <>
          <span className="font-medium text-foreground">Workstreams</span>
          <span>deduced from activity</span>
        </>
      }
    >
      <div className="divide-y">
        <WorkstreamRow
          integrations={["slack", "github", "linear"]}
          name="Tip-pooling compliance"
          note="Per-location split shipped. Certification review is the open thread."
          timeline="May 12 to Jul 30"
        />
        <WorkstreamRow
          integrations={["notion", "gmail"]}
          name="SOC 2 audit"
          note="Evidence collection under way. Access reviews are with Jonas."
          timeline="Jun 1 to Aug 30"
        />
        <WorkstreamRow
          integrations={["linear"]}
          name="Onboarding revamp"
          note="Still open, no recent activity."
          timeline="Quiet since Jun 20"
        />
      </div>
      <p className="flex items-center gap-2 border-t bg-muted/30 px-5 py-2.5 text-muted-foreground text-xs">
        From
        <span className="flex items-center gap-1.5">
          {sourceIntegrations.map((integration) => (
            <IntegrationLogo
              className="size-3.5"
              integration={integration}
              key={integration}
            />
          ))}
        </span>
        and every other tool you connect.
      </p>
    </Prop>
  )
}

// The six integrations named in the shipped fiction's footer line.
const sourceIntegrations: readonly Integration[] = [
  "slack",
  "github",
  "linear",
  "gmail",
  "googleCalendar",
  "notion",
]

function WorkstreamRow({
  integrations,
  name,
  note,
  timeline,
}: {
  integrations: readonly Integration[]
  name: string
  note: string
  timeline: string
}) {
  return (
    <div className="px-5 py-3.5">
      <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5">
        <span className="flex items-center gap-2 font-medium text-sm">
          {name}
          <IntegrationLogoStack integrations={integrations} />
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {timeline}
        </span>
      </p>
      <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
        {note}
      </p>
    </div>
  )
}
