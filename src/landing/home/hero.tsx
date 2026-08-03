import { ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GetStarted } from "../cta"
import { Mention } from "../section"
import { PrereadApp } from "./preread"

export function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 pt-14 pb-24 md:grid-cols-[minmax(0,1fr)_minmax(0,24.5rem)] md:pt-24 md:pb-32 lg:gap-20">
      <div>
        {/* Plain text flow rather than a flex row. As flex items, the chip and
            the sentence were separated by the row's gap on top of the space
            already inside the text and the chip's own padding, which read as
            a wider space than the ones between the words after it. */}
        {/* Two claims, not one list. The named three are the surfaces you can
            mention Jori in, which is a bounded set and the specific thing a
            reader can check. Everything else Jori reaches is named by the
            mechanism instead, so the line stays this length as the connector
            list grows. */}
        <p className="text-muted-foreground text-sm">
          <Mention /> answers in Slack, GitHub, and Linear, and works across
          everything you connect
        </p>
        <h1 className="mt-5 font-medium text-5xl text-balance tracking-tight sm:text-6xl lg:text-7xl">
          Jori writes the Monday pre-read.
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground leading-relaxed sm:text-lg">
          What moved, what stalled, what shipped. Jori reads the week across
          your tools and keeps one live page your leadership team opens before
          the sync, with every line linked to where it came from. Nothing was
          typed in.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <GetStarted prominent />
          <Button asChild size="xl" variant="outline">
            <a href="#apps">
              See how the apps work
              <ArrowDown data-icon="inline-end" />
            </a>
          </Button>
        </div>
      </div>
      <div className="max-w-md md:max-w-none">
        <PrereadApp />
      </div>
    </section>
  )
}
