import { type Integration } from "@contracts/integrations"
import { BrandIcon } from "@/shared/brand"
import { IntegrationLogo } from "@/shared/logo/integration"
import { Prop } from "../section"

type Attention = {
  integrations: readonly Integration[]
  note: string
  state: string
  title: string
}

/** Only what changed against expectation. Work that moved as planned is a
 *  number; the rows are the two things the sync would otherwise find late. */
const attention: readonly Attention[] = [
  {
    integrations: ["linear", "notion"],
    note: "Waiting on the county letter since Tuesday. Nobody is chasing it.",
    state: "Stalled 6 days",
    title: "Tip-pooling compliance",
  },
  {
    integrations: ["slack", "linear"],
    note: "Went quiet after Thursday's call. The renewal is four weeks out.",
    state: "Quiet 5 days",
    title: "Harbor House escalation",
  },
]

/**
 * The hero app.
 *
 * It has one job: show that this is a page a leadership team opens, not a
 * message. So it answers the three questions a pre-read exists to answer, in
 * order. How did the week move, what deserves a person's attention, and is
 * this current.
 *
 * Work that moved as expected earns no room here. Listing it fills the card
 * with rows nobody has to act on, and the reason to open the page is the two
 * that somebody does. The source logos carry the rest of the argument: this is
 * assembled across tools, which is the part no single one of them gives you.
 */
export function PrereadApp() {
  return (
    <Prop
      label={
        <>
          <BrandIcon className="size-4" />
          <span className="font-medium text-foreground">Monday pre-read</span>
          <span className="ml-auto">Assembled 06:40</span>
        </>
      }
    >
      <div className="px-5 pt-4 pb-3.5">
        <p className="flex items-baseline justify-between gap-3">
          <span className="font-medium text-sm">Copperline</span>
          <span className="text-muted-foreground text-xs">Week 32</span>
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs">
          <Count label="moved" tone="text-primary" value={7} />
          <Separator />
          <Count label="stalled" tone="text-destructive" value={2} />
          <Separator />
          <Count label="shipped" tone="text-foreground" value={5} />
        </p>
      </div>
      <p className="border-t bg-muted/30 px-5 py-2 text-muted-foreground text-xs">
        Worth a person's time
      </p>
      <div className="divide-y border-t">
        {attention.map((item) => (
          <AttentionRow item={item} key={item.title} />
        ))}
      </div>
      <p className="border-t bg-muted/30 px-5 py-2.5 text-muted-foreground text-xs">
        Ready before the Monday sync. Every line links to where it came from.
      </p>
    </Prop>
  )
}

function Count({
  label,
  tone,
  value,
}: {
  label: string
  tone: string
  value: number
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={`font-medium tabular-nums ${tone}`}>{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}

function Separator() {
  return (
    <span aria-hidden="true" className="text-border">
      ·
    </span>
  )
}

function AttentionRow({ item }: { item: Attention }) {
  return (
    <div className="px-5 py-3">
      <p className="flex flex-wrap items-center gap-x-2">
        {/* The logos are the evidence, not decoration: they are the only
            thing saying where this came from, so they keep their accessible
            names. */}
        <span className="flex shrink-0 items-center gap-1">
          {item.integrations.map((integration) => (
            <IntegrationLogo
              className="size-3.5"
              integration={integration}
              key={integration}
            />
          ))}
        </span>
        <span className="font-medium text-[13px] leading-snug">
          {item.title}
        </span>
        <span className="ml-auto shrink-0 text-muted-foreground text-xs">
          {item.state}
        </span>
      </p>
      <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
        {item.note}
      </p>
    </div>
  )
}
