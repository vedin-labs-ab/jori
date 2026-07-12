import { MarketingShell } from "../shell"
import { ContextSection } from "./context"
import { Control } from "./control"
import { Day } from "./day"
import { Hero } from "./hero"
import { Start } from "./start"
import { Threads } from "./threads"

export function Landing() {
  return (
    <MarketingShell>
      <Hero />
      <Day />
      <Threads />
      <ContextSection />
      <Control />
      <Start />
    </MarketingShell>
  )
}
