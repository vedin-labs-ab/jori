import { type Integration } from "@contracts/integrations"
import { BrandIcon } from "@/shared/brand"
import { IntegrationLogo } from "@/shared/logo/integration"
import { Definition, Prop, Section } from "../section"

type BodyOfWork = {
  integrations: readonly Integration[]
  name: string
  threads: number
  updated: string
}

/** The same week as the hero app, one level up: the release the hero is
 *  counting down is one of three things in flight, and the other two are
 *  shaped nothing like it. A compliance push and a customer escalation next
 *  to a release is what says Jori models the work rather than filling in a
 *  release template. */
const inFlight: readonly BodyOfWork[] = [
  {
    integrations: ["github", "linear"],
    name: "2.14 release",
    threads: 14,
    updated: "4m",
  },
  {
    integrations: ["linear", "notion"],
    name: "Tip-pooling compliance",
    threads: 6,
    updated: "1h",
  },
  {
    integrations: ["slack", "linear"],
    name: "Harbor House escalation",
    threads: 3,
    updated: "22m",
  },
]

export function Context() {
  return (
    <Section
      lede="What's happening lives scattered across threads, issues, and pull requests, and in people's heads. Jori reads what already exists and keeps one picture of the work in flight, grouped the way your team would name it out loud."
      title="Stop rebuilding the picture by hand"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <dl className="space-y-8">
          <Definition term="Assembled from activity">
            No wiki, and nothing anyone has to keep updated. Jori reads the
            threads, issues, and pull requests that already exist.
          </Definition>
          <Definition term="Grouped the way people talk">
            Single threads of work roll up into the efforts a team actually
            names: a release, a compliance push, a customer escalation.
          </Definition>
          <Definition term="Sharper the longer it runs">
            Every run adds to what Jori knows about your company. This is the
            part a new tool can't copy on the day you switch.
          </Definition>
        </dl>
        <InFlight />
      </div>
    </Section>
  )
}

/**
 * What Jori knows, shown as the roster it actually is.
 *
 * The reflex for "the system understands your company" is a node graph, and a
 * node graph says nothing a reader can check: no names, no sources, no clock.
 * A list answers the three questions that matter instead. What is going on,
 * where did that come from, and is it current.
 */
function InFlight() {
  return (
    <Prop
      label={
        <>
          <BrandIcon className="size-4" />
          <span className="font-medium text-foreground">What's in flight</span>
          <span className="ml-auto">Copperline</span>
        </>
      }
    >
      <div className="divide-y">
        {inFlight.map((body) => (
          <BodyRow body={body} key={body.name} />
        ))}
      </div>
      {/* The definition beside this one is already called "Assembled from
          activity", so saying it again here spends the footer on a word the
          reader met a moment ago. The second sentence always carried the
          point on its own. */}
      <p className="border-t bg-muted/30 px-5 py-2.5 text-muted-foreground text-xs">
        Nothing here was typed in.
      </p>
    </Prop>
  )
}

function BodyRow({ body }: { body: BodyOfWork }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      {/* The logos are the evidence, not decoration: they are the only thing
          saying where this came from, so they keep their accessible names. */}
      <span className="flex shrink-0 items-center gap-1">
        {body.integrations.map((integration) => (
          <IntegrationLogo
            className="size-3.5"
            integration={integration}
            key={integration}
          />
        ))}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-[13px]">
        {body.name}
      </span>
      <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
        {body.threads} threads · {body.updated}
      </span>
    </div>
  )
}
