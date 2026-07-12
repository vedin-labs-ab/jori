import { ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GetStarted } from "../cta"
import { Mention, Reveal } from "../section"
import { MorningBrief } from "./brief"

export function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 pt-14 pb-24 md:grid-cols-[minmax(0,1fr)_minmax(0,24.5rem)] md:pt-24 md:pb-32 lg:gap-20">
      <div>
        <Reveal>
          <p className="flex flex-wrap items-center gap-x-1.5 text-muted-foreground text-sm">
            <Mention /> is an AI teammate for your company
          </p>
        </Reveal>
        <Reveal delay={1}>
          <h1 className="mt-5 font-medium text-5xl text-balance tracking-tight sm:text-6xl lg:text-7xl">
            Sit down already caught up.
          </h1>
        </Reveal>
        <Reveal delay={2}>
          <p className="mt-6 max-w-xl text-base text-muted-foreground leading-relaxed sm:text-lg">
            Milo works inside Slack, your email, and your calendar. A brief
            before the day starts, a dossier before every meeting, drafts for
            the threads waiting on you. You set the rules, and every run keeps
            receipts.
          </p>
        </Reveal>
        <Reveal delay={3}>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <GetStarted prominent />
            <Button
              asChild
              className="h-10 px-4 text-sm"
              size="lg"
              variant="outline"
            >
              <a href="#day">
                See a day with Milo
                <ArrowDown data-icon="inline-end" />
              </a>
            </Button>
          </div>
        </Reveal>
      </div>
      <Reveal className="max-w-md md:max-w-none" delay={3}>
        <MorningBrief />
      </Reveal>
    </section>
  )
}
