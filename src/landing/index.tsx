import { BrandMark } from "@/shared/brand"
import { ContextSection } from "./context"
import { Day } from "./day"
import { LandingHeader } from "./header"
import { Hero } from "./hero"
import { Start } from "./start"
import { Threads } from "./threads"
import { Trust } from "./trust"

export function Landing() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <LandingHeader />
      <main>
        <Hero />
        <Day />
        <Threads />
        <ContextSection />
        <Trust />
        <Start />
      </main>
      <LandingFooter />
    </div>
  )
}

function LandingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
        <BrandMark />
        <p className="text-muted-foreground text-sm">
          An AI teammate for company work.
        </p>
      </div>
    </footer>
  )
}
