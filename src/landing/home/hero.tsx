import { ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GetStarted } from "../cta"
import { Mention } from "../section"
import { ReleaseApp } from "./release"

export function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 pt-14 pb-24 md:grid-cols-[minmax(0,1fr)_minmax(0,24.5rem)] md:pt-24 md:pb-32 lg:gap-20">
      <div>
        <p className="flex flex-wrap items-center gap-x-1.5 text-muted-foreground text-sm">
          <Mention /> works in Slack, GitHub, and Linear
        </p>
        <h1 className="mt-5 font-medium text-5xl text-balance tracking-tight sm:text-6xl lg:text-7xl">
          Hand over the work you repeat.
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground leading-relaxed sm:text-lg">
          The release checklist. The dependency sweep. The Thursday triage. Jori
          runs them where the work already lives, and leaves behind a live app
          your team opens instead of a message that scrolls away.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <GetStarted prominent />
          <Button asChild size="xl" variant="outline">
            <a href="#apps">
              See what it leaves behind
              <ArrowDown data-icon="inline-end" />
            </a>
          </Button>
        </div>
      </div>
      <div className="max-w-md md:max-w-none">
        <ReleaseApp />
      </div>
    </section>
  )
}
