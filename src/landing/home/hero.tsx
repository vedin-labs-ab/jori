import { ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GetStarted } from "../cta"
import { Mention } from "../section"
import { PrereadPage } from "./preread"

export function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 pt-14 pb-24 md:grid-cols-[minmax(0,1fr)_minmax(0,24.5rem)] md:pt-24 md:pb-32 lg:gap-20">
      <div>
        {/* Plain text flow rather than a flex row. As flex items, the chip and
            the sentence were separated by the row's gap on top of the space
            already inside the text and the chip's own padding, which read as
            a wider space than the ones between the words after it. */}
        {/* Two claims, not one list. The named surfaces are the ones you can
            reach Jori in directly, which is a bounded set and the specific
            thing a reader can check. Everything else Jori reaches is named by
            the mechanism instead, so the line stays this length as the
            connector list grows. */}
        <p className="text-muted-foreground text-sm">
          <Mention /> answers in Slack, GitHub, Linear, email, and more
        </p>
        <h1 className="mt-5 font-medium text-5xl text-balance tracking-tight sm:text-6xl lg:text-7xl">
          The AI teammate your whole company shares.
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground leading-relaxed sm:text-lg">
          Hand it the work your team repeats, wherever it comes up. It runs in
          the cloud, remembers as one, and shows you everything: what it read,
          what it did, what it cost.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <GetStarted prominent />
          <Button asChild size="xl" variant="outline">
            <a href="#everywhere">
              See how it works
              <ArrowDown data-icon="inline-end" />
            </a>
          </Button>
        </div>
      </div>
      <div className="max-w-md md:max-w-none">
        <PrereadPage />
      </div>
    </section>
  )
}
